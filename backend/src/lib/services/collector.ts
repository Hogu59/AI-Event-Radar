import { getEnabledAdapters } from '../sources';
import { normalize } from '../sources/normalize';
import type { CollectResult, SourceId } from '../sources/types';
import { getSupabaseAdmin } from '../db/supabase-admin';

export interface RunSummary {
  source: SourceId;
  status: 'success' | 'partial' | 'failed';
  events_collected: number;
  events_new: number;
  events_updated: number;
  started_at: string;
  finished_at: string;
  error_message?: string;
}

interface UpsertCounts {
  inserted: number;
  updated: number;
}

async function persistResult(result: CollectResult): Promise<UpsertCounts> {
  if (result.events.length === 0) return { inserted: 0, updated: 0 };

  const admin = getSupabaseAdmin();
  const normalized = result.events.map((e) => normalize(e));

  // Pre-check which dedupe_hashes already exist to compute inserted vs updated counts.
  const hashes = normalized.map((n) => n.dedupe_hash);
  const { data: existing, error: selErr } = await admin
    .from('events')
    .select('dedupe_hash')
    .in('dedupe_hash', hashes);
  if (selErr) throw selErr;
  const existingSet = new Set((existing ?? []).map((r: any) => r.dedupe_hash)); // eslint-disable-line @typescript-eslint/no-explicit-any

  const { error: upErr } = await admin
    .from('events')
    .upsert(normalized, { onConflict: 'dedupe_hash' });
  if (upErr) throw upErr;

  let inserted = 0;
  let updated = 0;
  for (const n of normalized) {
    if (existingSet.has(n.dedupe_hash)) updated++;
    else inserted++;
  }
  return { inserted, updated };
}

async function logRun(summary: RunSummary, triggered_by: 'cron' | 'manual'): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('source_run_logs').insert({
    source: summary.source,
    started_at: summary.started_at,
    finished_at: summary.finished_at,
    status: summary.status,
    events_collected: summary.events_collected,
    events_new: summary.events_new,
    events_updated: summary.events_updated,
    error_message: summary.error_message ?? null,
    triggered_by,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[collector] failed to write source_run_logs:', error.message);
  }
}

export async function runCollection(opts: {
  sources?: SourceId[];
  triggered_by?: 'cron' | 'manual';
}): Promise<RunSummary[]> {
  const adapters = getEnabledAdapters(opts.sources);
  const triggered_by = opts.triggered_by ?? 'cron';

  const settled = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const result = await adapter.collect({ timeoutMs: 60_000 });
      let inserted = 0;
      let updated = 0;
      let status: RunSummary['status'] = result.status;
      let error_message = result.error_message;

      if (result.status !== 'failed') {
        try {
          const counts = await persistResult(result);
          inserted = counts.inserted;
          updated = counts.updated;
        } catch (e) {
          status = 'partial';
          error_message = e instanceof Error ? e.message : String(e);
        }
      }

      const summary: RunSummary = {
        source: adapter.id,
        status,
        events_collected: result.events.length,
        events_new: inserted,
        events_updated: updated,
        started_at: result.started_at,
        finished_at: result.finished_at,
        error_message,
      };
      await logRun(summary, triggered_by);
      return summary;
    }),
  );

  return settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : ({
          source: 'festa', // placeholder; cannot recover adapter id from rejection
          status: 'failed',
          events_collected: 0,
          events_new: 0,
          events_updated: 0,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          error_message: s.reason instanceof Error ? s.reason.message : String(s.reason),
        } satisfies RunSummary),
  );
}
