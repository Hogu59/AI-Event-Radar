import { SourceAdapter, type CollectResult, type CollectOptions, type RawEvent } from './types';
import { classifyEvent } from './ai-classifier';
import devEventMock from '../../../mocks/dev-event.json';

const DEV_EVENT_README_URL =
  'https://raw.githubusercontent.com/brave-people/Dev-Event/master/README.md';

const USER_AGENT = 'AIEventRadar/0.1 (+https://aieventradar.vercel.app)';

export class DevEventAdapter extends SourceAdapter {
  readonly id = 'dev_event' as const;
  readonly enabled = process.env.ENABLE_DEV_EVENT !== 'false';

  async collect(opts?: CollectOptions): Promise<CollectResult> {
    const started_at = this.now();
    const limit = opts?.limit ?? 50;

    if (!this.enabled) {
      return {
        source: this.id,
        events: [],
        started_at,
        finished_at: this.now(),
        status: 'success',
        error_message: 'ENABLE_DEV_EVENT=false (skipped)',
      };
    }

    if (this.useMock()) {
      const events = (devEventMock.events as RawEvent[]).slice(0, limit);
      return {
        source: this.id,
        events,
        started_at,
        finished_at: this.now(),
        status: 'success',
      };
    }

    try {
      const events = await this.withTimeout(this.fetchReadme(limit), opts?.timeoutMs ?? 20_000);
      return {
        source: this.id,
        events,
        started_at,
        finished_at: this.now(),
        status: events.length > 0 ? 'success' : 'partial',
      };
    } catch (err) {
      return {
        source: this.id,
        events: [],
        started_at,
        finished_at: this.now(),
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async fetchReadme(limit: number): Promise<RawEvent[]> {
    const headers: Record<string, string> = {
      accept: 'text/plain, */*',
      'user-agent': USER_AGENT,
    };
    if (process.env.GITHUB_TOKEN) {
      headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(DEV_EVENT_README_URL, { headers });
    if (!res.ok) throw new Error(`Dev-Event README HTTP ${res.status}`);
    const md = await res.text();
    return parseDevEventMarkdown(md, limit);
  }
}

/**
 * Parse the brave-people/Dev-Event README markdown.
 *
 * Format (bullet list under monthly headers):
 *
 *   ## `26년 05월`
 *   - __[Title](url)__
 *     - 분류: `오프라인(서울 강남구)`, `무료`, `세미나`, `AI`
 *     - 주최: Host
 *     - 접수: 05. 03(일) ~ 05. 18(월)
 *     - 일시: 05. 19(화)   (alternative to 접수)
 */
export function parseDevEventMarkdown(md: string, limit = 200): RawEvent[] {
  const lines = md.split(/\r?\n/);
  const events: RawEvent[] = [];

  const monthHeaderRe = /^##\s+`?(\d{2,4})년\s*(\d{1,2})월`?/;
  const titleRe = /^[\s\-*]*__\[([^\]]+)\]\(([^)]+)\)__/;
  const propRe = /^\s+-\s*(분류|주최|접수|일시|장소|가격)\s*:\s*(.+)$/;
  // Non-event sections we should stop at (recap/etc).
  const stopSectionRe = /^##\s+(개발자\s*동아리|컨퍼런스|Conference|Contributors|발표\s*자료|채용)/i;

  let curYear: number | null = null;
  let curMonth: number | null = null;
  let stopped = false;

  // Tracks the in-progress event whose property lines we're currently collecting.
  type Pending = {
    title: string;
    url: string;
    year: number;
    month: number;
    props: Record<string, string>;
  };
  let pending: Pending | null = null;

  const flush = () => {
    if (!pending) return;
    const ev = buildEvent(pending);
    if (ev) events.push(ev);
    pending = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00A0/g, ' ');
    if (stopped) break;

    if (stopSectionRe.test(line)) {
      flush();
      stopped = true;
      break;
    }

    const monthMatch = line.match(monthHeaderRe);
    if (monthMatch) {
      flush();
      const y = parseInt(monthMatch[1], 10);
      curYear = y < 100 ? 2000 + y : y;
      curMonth = parseInt(monthMatch[2], 10);
      continue;
    }

    if (curYear == null || curMonth == null) continue;

    const titleMatch = line.match(titleRe);
    if (titleMatch) {
      flush();
      pending = {
        title: titleMatch[1].trim(),
        url: titleMatch[2].trim(),
        year: curYear,
        month: curMonth,
        props: {},
      };
      continue;
    }

    if (pending) {
      const propMatch = line.match(propRe);
      if (propMatch) {
        pending.props[propMatch[1]] = propMatch[2].trim();
        continue;
      }
      // Blank line or unrelated line ends the current event block when next title arrives;
      // we keep pending until next title or month header, so do nothing here.
    }
  }
  flush();

  // Filter to AI-related events and enforce limit.
  const filtered: RawEvent[] = [];
  for (const ev of events) {
    const cls = classifyEvent({
      title: ev.title,
      description: ev.description,
      raw_categories: ev.raw_categories,
      host_name: ev.host_name,
    });
    if (cls.is_ai_related) {
      filtered.push(ev);
      if (filtered.length >= limit) break;
    }
  }
  return filtered;
}

function buildEvent(p: {
  title: string;
  url: string;
  year: number;
  month: number;
  props: Record<string, string>;
}): RawEvent | null {
  const categoryRaw = p.props['분류'] ?? '';
  const host = p.props['주최'] ?? '';
  const dateLine = p.props['일시'] ?? p.props['접수'] ?? '';

  // Categories arrive as backtick-quoted, comma-separated items.
  const categories = [...categoryRaw.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  const locationStr = categories.find((c) => /온라인|오프라인/.test(c)) ?? '';
  const priceTag = categories.find((c) => /무료|유료/.test(c));
  const location_type: 'online' | 'offline' | 'hybrid' = /온라인/.test(locationStr)
    ? 'online'
    : 'offline';
  const locParenMatch = locationStr.match(/\(([^)]+)\)/);
  const locationName = locParenMatch ? locParenMatch[1].trim() : undefined;

  // Date extraction. Accept MM.DD or MM. DD with optional Korean weekday parens.
  // Use the first MM.DD that appears in either 일시 or 접수 line as start_at.
  const dayMatch = dateLine.match(/(\d{1,2})\.\s*(\d{1,2})/);
  let start_at: string;
  if (dayMatch) {
    const mo = parseInt(dayMatch[1], 10);
    const day = parseInt(dayMatch[2], 10);
    let year = p.year;
    // Month rollover (header says month=12, date "01.05" → next year).
    if (mo < p.month - 6) year = p.year + 1;
    start_at = new Date(
      `${year}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00+09:00`,
    ).toISOString();
  } else {
    start_at = new Date(
      `${p.year}-${String(p.month).padStart(2, '0')}-01T09:00:00+09:00`,
    ).toISOString();
  }

  const slug = p.url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .slice(0, 80);

  return {
    source: 'dev_event',
    source_event_id: `dev-event-${p.year}${String(p.month).padStart(2, '0')}-${slug}`,
    source_url: p.url,
    title: p.title,
    start_at,
    timezone: 'Asia/Seoul',
    country: 'KR',
    location_type,
    location_name: locationName,
    host_name: host || undefined,
    price: priceTag,
    raw_categories: categories.length > 0 ? categories : undefined,
  };
}
