import { SourceAdapter, type CollectResult, type CollectOptions, type RawEvent } from './types';
import lumaMock from '../../../mocks/luma.json';

const LUMA_API = 'https://api.lu.ma/discover/get-paginated-events';
const USER_AGENT = 'AIEventRadar/0.1 (+https://aieventradar.vercel.app)';

interface LumaEvent {
  api_id: string;
  url: string;
  name: string;
  description?: string;
  start_at: string;
  end_at?: string;
  timezone?: string;
  cover_url?: string;
  location_type?: 'offline' | 'online' | 'hybrid';
  geo_address_info?: {
    city?: string | null;
    city_state?: string | null;
    full_address?: string | null;
    country?: string | null;
    country_code?: string | null;
    region?: string | null;
  };
}

interface LumaHost {
  name?: string;
  username?: string;
}

interface LumaEntry {
  api_id: string;
  event: LumaEvent;
  hosts?: LumaHost[];
}

interface LumaApiResponse {
  entries?: LumaEntry[];
  has_more?: boolean;
  next_cursor?: string | null;
}

export class LumaAdapter extends SourceAdapter {
  readonly id = 'luma' as const;
  readonly enabled = process.env.ENABLE_LUMA !== 'false';

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
        error_message: 'ENABLE_LUMA=false (skipped)',
      };
    }

    if (this.useMock()) {
      const events = (lumaMock.events as RawEvent[]).slice(0, limit);
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
    const seen = new Set<string>();
    let cursor: string | null = null;
    const maxPages = 5;

    for (let page = 0; page < maxPages && out.length < limit; page++) {
      const params = new URLSearchParams({ slug: 'ai', period: 'future' });
      if (cursor) params.set('pagination_cursor', cursor);
      const url = `${LUMA_API}?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': USER_AGENT,
        },
      });
      if (!res.ok) {
        if (page === 0) throw new Error(`Luma API HTTP ${res.status}`);
        break;
      }
      const data: LumaApiResponse = await res.json();
      const entries = data.entries ?? [];
      if (entries.length === 0) break;

      for (const entry of entries) {
        if (out.length >= limit) break;
        const ev = toRawEvent(entry);
        if (!ev) continue;
        if (seen.has(ev.source_event_id)) continue;
        seen.add(ev.source_event_id);
        out.push(ev);
      }

      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return out;
  }
}

function toRawEvent(entry: LumaEntry): RawEvent | null {
  const e = entry.event;
  if (!e || !e.api_id || !e.start_at || !e.name) return null;

  const geo = e.geo_address_info ?? {};
  const host = entry.hosts?.[0]?.name;
  const slug = e.url || e.api_id;
  const sourceUrl = slug.startsWith('http') ? slug : `https://lu.ma/${slug}`;
  const isOnline = e.location_type === 'online';
  const city = (geo.city_state ?? '').split(',')[0]?.trim() || (isOnline ? 'Online' : undefined);

  return {
    source: 'luma',
    source_event_id: `luma-${e.api_id}`,
    source_url: sourceUrl,
    title: e.name.trim(),
    description: e.description?.trim(),
    start_at: e.start_at,
    end_at: e.end_at,
    timezone: e.timezone,
    location_type: e.location_type ?? (isOnline ? 'online' : 'offline'),
    location_name: geo.full_address ?? geo.city_state ?? undefined,
    city,
    country: geo.country_code ?? geo.country ?? undefined,
    host_name: host?.trim(),
    thumbnail_url: e.cover_url,
  };
}
