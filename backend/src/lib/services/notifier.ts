import { getSupabaseAdmin } from '../db/supabase-admin';
import { matchSubscription, type SubscriptionRow, type EventRow } from '../notifications/matcher';
import { sendDigestEmail, type DigestEvent } from '../notifications/email';
import { isKstHour, isKstMondayHour } from '../utils/date';

export type NotifyMode = 'auto' | 'realtime' | 'daily' | 'weekly' | 'deadline';

export interface NotifyReport {
  matched_subscriptions: number;
  emails_sent: number;
  emails_failed: number;
  errors: { user_id: string; error: string }[];
}

interface UserRow {
  id: string;
  email: string;
  digest_frequency: 'realtime' | 'daily' | 'weekly' | 'off';
}

type Frequency = UserRow['digest_frequency'];

function freqsForMode(mode: NotifyMode, now = new Date()): Set<Frequency> {
  if (mode === 'realtime') return new Set(['realtime']);
  if (mode === 'daily') return new Set(['daily']);
  if (mode === 'weekly') return new Set(['weekly']);
  if (mode === 'deadline') return new Set([]);
  // auto: detect from KST clock
  const out = new Set<Frequency>(['realtime']);
  if (isKstHour(9, now)) out.add('daily');
  if (isKstMondayHour(9, now)) out.add('weekly');
  return out;
}

const NEW_WINDOW_HOURS: Record<Frequency, number> = {
  realtime: 2,
  daily: 24,
  weekly: 24 * 7,
  off: 0,
};

async function fetchActiveSubscriptionsWithUsers() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('subscriptions')
    .select(
      'id, user_id, name, keywords, sources, location_types, cities, notify_on_new, notify_on_deadline, is_active, users(id, email, digest_frequency)',
    )
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as unknown as (SubscriptionRow & { users: UserRow })[];
}

interface EventWithCollected extends EventRow {
  collected_at: string;
}

async function fetchRecentEvents(maxHoursAgo: number): Promise<EventWithCollected[]> {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - maxHoursAgo * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from('events')
    .select(
      'id, source, title, description, start_at, city, location_type, host_name, price, keywords_matched, source_url, collected_at',
    )
    .gte('collected_at', since)
    .eq('is_ai_related', true)
    .order('start_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as EventWithCollected[];
}

async function fetchUpcomingDeadlineEvents(): Promise<EventRow[]> {
  const admin = getSupabaseAdmin();
  const from = new Date(Date.now() + 60 * 3600 * 1000).toISOString(); // 60h
  const to = new Date(Date.now() + 84 * 3600 * 1000).toISOString();   // 84h (72h ±12)
  const { data, error } = await admin
    .from('events')
    .select(
      'id, source, title, description, start_at, city, location_type, host_name, price, keywords_matched, source_url',
    )
    .gte('start_at', from)
    .lte('start_at', to)
    .eq('is_ai_related', true)
    .limit(500);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/**
 * Returns the set of event_ids already notified for a given (subscription, kind) pair,
 * within the lookback window (hours). Used to suppress duplicates when cron runs hourly.
 */
async function alreadyNotifiedEventIds(
  subscriptionId: string,
  kind: 'digest' | 'realtime' | 'deadline_d3',
  lookbackHours: number,
): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from('notification_logs')
    .select('event_ids, sent_at')
    .eq('subscription_id', subscriptionId)
    .eq('kind', kind)
    .eq('status', 'sent')
    .gte('sent_at', since);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[notifier] alreadyNotifiedEventIds failed:', error.message);
    return new Set();
  }
  const out = new Set<string>();
  for (const row of data ?? []) {
    for (const id of row.event_ids ?? []) out.add(id as string);
  }
  return out;
}

async function logNotification(args: {
  user_id: string;
  subscription_id: string | null;
  event_ids: string[];
  status: 'sent' | 'failed';
  error?: string;
  kind: 'digest' | 'realtime' | 'deadline_d3';
}) {
  const admin = getSupabaseAdmin();
  await admin.from('notification_logs').insert({
    user_id: args.user_id,
    subscription_id: args.subscription_id,
    event_ids: args.event_ids,
    channel: 'email',
    status: args.status,
    sent_at: args.status === 'sent' ? new Date().toISOString() : null,
    error: args.error ?? null,
    kind: args.kind,
  });
}

function toDigestEvent(e: EventRow): DigestEvent {
  return {
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    source: e.source,
    source_url: e.source_url,
    city: e.city,
    host_name: e.host_name,
    price: e.price,
  };
}

/** lookback window used for de-dup against notification_logs (matches the freq window). */
const DEDUP_LOOKBACK: Record<Exclude<Frequency, 'off'>, number> = {
  realtime: 24,    // suppress within 24h of last send for the same event
  daily: 36,       // a daily user shouldn't see same event twice in two consecutive runs
  weekly: 24 * 8,  // 8 days lookback for weekly digest
};

export async function runNotifications(opts: { mode: NotifyMode; dry_run?: boolean }): Promise<NotifyReport> {
  const report: NotifyReport = {
    matched_subscriptions: 0,
    emails_sent: 0,
    emails_failed: 0,
    errors: [],
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const subs = await fetchActiveSubscriptionsWithUsers();
  const targetFreqs = freqsForMode(opts.mode);
  const nowMs = Date.now();

  // Standard new-event digest path: run per-frequency, each with its own window.
  if (opts.mode !== 'deadline' && targetFreqs.size > 0) {
    for (const freq of targetFreqs) {
      if (freq === 'off') continue;
      const windowHours = NEW_WINDOW_HOURS[freq];
      const recent = await fetchRecentEvents(windowHours);
      if (recent.length === 0) continue;

      const candidates = recent.filter((e) => {
        const startMs = new Date(e.start_at).getTime();
        return startMs > nowMs; // event not yet started
      });

      const kind: 'digest' | 'realtime' = freq === 'realtime' ? 'realtime' : 'digest';

      for (const sub of subs) {
        if (!sub.notify_on_new) continue;
        if (sub.users?.digest_frequency !== freq) continue;

        let matching = candidates.filter((e) => matchSubscription(sub, e));
        if (matching.length === 0) continue;

        // De-dup against previously sent
        const alreadySent = await alreadyNotifiedEventIds(
          sub.id,
          kind,
          DEDUP_LOOKBACK[freq],
        );
        if (alreadySent.size > 0) {
          matching = matching.filter((e) => !alreadySent.has(e.id));
        }
        if (matching.length === 0) continue;

        report.matched_subscriptions++;
        if (opts.dry_run) continue;

        try {
          await sendDigestEmail({
            to: sub.users.email,
            subscriptionName: sub.name,
            events: matching.slice(0, 20).map(toDigestEvent),
            appUrl,
          });
          report.emails_sent++;
          await logNotification({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_ids: matching.map((e) => e.id),
            status: 'sent',
            kind,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          report.emails_failed++;
          report.errors.push({ user_id: sub.user_id, error: msg });
          await logNotification({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_ids: matching.map((e) => e.id),
            status: 'failed',
            error: msg,
            kind,
          });
        }
      }
    }
  }

  // Deadline D-3 path (auto: KST 09:00 only; explicit deadline: always)
  const runDeadline =
    opts.mode === 'deadline' || (opts.mode === 'auto' && isKstHour(9));
  if (runDeadline) {
    const upcoming = await fetchUpcomingDeadlineEvents();
    if (upcoming.length > 0) {
      for (const sub of subs) {
        if (!sub.notify_on_deadline) continue;
        const userFreq = sub.users?.digest_frequency;
        if (!userFreq || userFreq === 'off') continue;

        let matching = upcoming.filter((e) => matchSubscription(sub, e));
        if (matching.length === 0) continue;

        // De-dup: D-3 alert for same event should fire at most once.
        const alreadySent = await alreadyNotifiedEventIds(sub.id, 'deadline_d3', 24 * 7);
        if (alreadySent.size > 0) {
          matching = matching.filter((e) => !alreadySent.has(e.id));
        }
        if (matching.length === 0) continue;

        report.matched_subscriptions++;
        if (opts.dry_run) continue;

        try {
          await sendDigestEmail({
            to: sub.users.email,
            subscriptionName: `${sub.name} (마감 D-3)`,
            events: matching.slice(0, 20).map(toDigestEvent),
            appUrl,
          });
          report.emails_sent++;
          await logNotification({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_ids: matching.map((e) => e.id),
            status: 'sent',
            kind: 'deadline_d3',
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          report.emails_failed++;
          report.errors.push({ user_id: sub.user_id, error: msg });
          await logNotification({
            user_id: sub.user_id,
            subscription_id: sub.id,
            event_ids: matching.map((e) => e.id),
            status: 'failed',
            error: msg,
            kind: 'deadline_d3',
          });
        }
      }
    }
  }

  return report;
}
