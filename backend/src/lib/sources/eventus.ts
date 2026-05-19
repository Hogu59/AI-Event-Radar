import { SourceAdapter, type CollectResult, type CollectOptions, type RawEvent } from './types';
import eventusMock from '../../../mocks/eventus.json';

const EVENTUS_LIST_URL = 'https://event-us.kr/list/event?cate=10'; // IT/개발 category

export class EventusAdapter extends SourceAdapter {
  readonly id = 'eventus' as const;
  readonly enabled = process.env.ENABLE_EVENTUS !== 'false';

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
        error_message: 'ENABLE_EVENTUS=false (skipped)',
      };
    }

    if (this.useMock()) {
      const events = (eventusMock.events as RawEvent[]).slice(0, limit);
      return {
        source: this.id,
        events,
        started_at,
        finished_at: this.now(),
        status: 'success',
      };
    }

    try {
      const events = await this.withTimeout(this.scrape(limit), opts?.timeoutMs ?? 60_000);
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

  private async scrape(_limit: number): Promise<RawEvent[]> {
    // event-us.kr requires JS rendering, previously handled with Playwright.
    // Playwright is incompatible with Vercel Serverless; Phase 2 will rehost on a
    // worker with a headless browser. With ENABLE_EVENTUS=false this is unreachable.
    void EVENTUS_LIST_URL;
    throw new Error(
      'EventusAdapter not implemented in fetch+cheerio mode (Phase 2: needs headless browser)',
    );
  }
}
