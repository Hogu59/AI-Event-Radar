export type SourceId = 'festa' | 'eventus' | 'luma' | 'dev_event' | 'devpost';

export type LocationTypeValue = 'online' | 'offline' | 'hybrid';

export interface RawEvent {
  source: SourceId;
  source_event_id: string;
  source_url: string;
  title: string;
  description?: string;
  start_at: string; // ISO8601
  end_at?: string;
  timezone?: string;
  location_type?: LocationTypeValue;
  location_name?: string;
  city?: string;
  country?: string;
  host_name?: string;
  price?: string;
  thumbnail_url?: string;
  raw_categories?: string[];
}

export interface CollectResult {
  source: SourceId;
  events: RawEvent[];
  started_at: string;
  finished_at: string;
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
}

export interface CollectOptions {
  limit?: number;
  timeoutMs?: number;
}

export abstract class SourceAdapter {
  abstract readonly id: SourceId;
  abstract readonly enabled: boolean;

  abstract collect(opts?: CollectOptions): Promise<CollectResult>;

  protected useMock(): boolean {
    return process.env.USE_MOCK === 'true';
  }

  protected now(): string {
    return new Date().toISOString();
  }

  protected async withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      p.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }
}

export interface NormalizedEvent {
  source: SourceId;
  source_event_id: string;
  source_url: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  timezone: string;
  location_type: LocationTypeValue | null;
  location_name: string | null;
  city: string | null;
  country: string | null;
  host_name: string | null;
  price: string | null;
  categories: string[];
  keywords_matched: string[];
  thumbnail_url: string | null;
  dedupe_hash: string;
  is_ai_related: boolean;
}
