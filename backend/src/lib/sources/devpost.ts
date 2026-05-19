import { SourceAdapter, type CollectResult, type CollectOptions, type RawEvent } from './types';
import devpostMock from '../../../mocks/devpost.json';

const DEVPOST_API = 'https://devpost.com/api/hackathons';
const USER_AGENT = 'AIEventRadar/0.1 (+https://aieventradar.vercel.app)';

interface DevpostHackathon {
  id: number;
  title: string;
  url: string;
  open_state: string;
  submission_period_dates: string;
  displayed_location?: { icon?: string; location?: string };
  thumbnail_url?: string;
  themes?: { id: number; name: string }[];
  prize_amount?: string;
  organization_name?: string;
  invite_only?: boolean;
}

interface DevpostApiResponse {
  hackathons: DevpostHackathon[];
  meta: { total_count: number; per_page: number; fuzzy: boolean };
}

export class DevpostAdapter extends SourceAdapter {
  readonly id = 'devpost' as const;
  readonly enabled = process.env.ENABLE_DEVPOST !== 'false';

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
        error_message: 'ENABLE_DEVPOST=false (skipped)',
      };
    }

    if (this.useMock()) {
      const events = (devpostMock.events as RawEvent[]).slice(0, limit);
      return {
        source: this.id,
        events,
        started_at,
        finished_at: this.now(),
        status: 'success',
      };
    }

    try {
      const events = await this.withTimeout(this.fetchApi(limit), opts?.timeoutMs ?? 20_000);
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

  private async fetchApi(limit: number): Promise<RawEvent[]> {
    const out: RawEvent[] = [];
    const seen = new Set<number>();
    const maxPages = 6; // up to ~54 items at 9/page

    for (let page = 1; page <= maxPages && out.length < limit; page++) {
      const url =
        `${DEVPOST_API}?themes%5B%5D=Machine+Learning%2FAI` +
        `&status%5B%5D=upcoming&status%5B%5D=open&page=${page}`;
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': USER_AGENT,
        },
      });
      if (!res.ok) {
        if (page === 1) throw new Error(`Devpost API HTTP ${res.status}`);
        break;
      }
      const data: DevpostApiResponse = await res.json();
      const items = data.hackathons ?? [];
      if (items.length === 0) break;

      for (const h of items) {
        if (out.length >= limit) break;
        if (seen.has(h.id)) continue;
        seen.add(h.id);
        const ev = toRawEvent(h);
        if (ev) out.push(ev);
      }

      // Polite delay between pages.
      if (page < maxPages && out.length < limit) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return out;
  }
}

function toRawEvent(h: DevpostHackathon): RawEvent | null {
  const range = parseDevpostPeriod(h.submission_period_dates);
  if (!range) return null;

  const prizeText = stripHtml(h.prize_amount ?? '').trim();
  const location = h.displayed_location?.location ?? 'Online';
  const isOnline = /online/i.test(location);
  const themes = (h.themes ?? []).map((t) => t.name);
  const thumb = h.thumbnail_url
    ? h.thumbnail_url.startsWith('//')
      ? `https:${h.thumbnail_url}`
      : h.thumbnail_url
    : undefined;

  return {
    source: 'devpost',
    source_event_id: `devpost-${h.id}`,
    source_url: h.url,
    title: h.title.trim(),
    description: themes.length > 0 ? `Themes: ${themes.join(', ')}` : undefined,
    start_at: range.start,
    end_at: range.end,
    timezone: 'UTC',
    location_type: isOnline ? 'online' : 'offline',
    location_name: location,
    city: isOnline ? 'Online' : undefined,
    country: 'Global',
    host_name: h.organization_name?.trim(),
    price: prizeText ? `Prize: ${prizeText}` : undefined,
    thumbnail_url: thumb,
    raw_categories: ['Hackathon', ...themes],
  };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Devpost submission_period_dates examples:
 *   "Apr 09 - May 20, 2026"         (full month on both sides)
 *   "May 16 - 22, 2026"             (month omitted on end)
 *   "Mar 30 - Jul 01, 2026"
 */
export function parseDevpostPeriod(s: string): { start: string; end: string } | null {
  if (!s) return null;
  const yearMatch = s.match(/(\d{4})\s*$/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1], 10);

  // Full form: "MMM DD - MMM DD, YYYY"
  let m = s.match(
    /([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/,
  );
  if (m) {
    const sm = MONTH_MAP[m[1].toLowerCase()];
    const em = MONTH_MAP[m[3].toLowerCase()];
    if (!sm || !em) return null;
    return {
      start: isoUtc(year, sm, parseInt(m[2], 10), 0, 0),
      end: isoUtc(year, em, parseInt(m[4], 10), 23, 59),
    };
  }

  // Compact form: "MMM DD - DD, YYYY"
  m = s.match(/([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),\s*(\d{4})/);
  if (m) {
    const sm = MONTH_MAP[m[1].toLowerCase()];
    if (!sm) return null;
    return {
      start: isoUtc(year, sm, parseInt(m[2], 10), 0, 0),
      end: isoUtc(year, sm, parseInt(m[3], 10), 23, 59),
    };
  }
  return null;
}

function isoUtc(y: number, mo: number, d: number, h: number, min: number): string {
  return new Date(Date.UTC(y, mo - 1, d, h, min, 0)).toISOString();
}
