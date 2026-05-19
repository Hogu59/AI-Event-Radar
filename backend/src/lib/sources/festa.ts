import { SourceAdapter, type CollectResult, type CollectOptions, type RawEvent } from './types';
import festaMock from '../../../mocks/festa.json';

const FESTA_LIST_URL = 'https://festa.io/events';

export class FestaAdapter extends SourceAdapter {
  readonly id = 'festa' as const;
  readonly enabled = process.env.ENABLE_FESTA !== 'false';

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
        error_message: 'ENABLE_FESTA=false (skipped)',
      };
    }

    if (this.useMock()) {
      const events = (festaMock.events as RawEvent[]).slice(0, limit);
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
    // Festa SSR is JS-heavy and previously relied on Playwright/Chromium, which is
    // incompatible with Vercel Serverless. Phase 2 will rehost on a worker that can
    // run a headless browser. Until then, throw so the collector logs a failure
    // when ENABLE_FESTA=true. With ENABLE_FESTA=false this code path is unreachable.
    void FESTA_LIST_URL;
    throw new Error(
      'FestaAdapter not implemented in fetch+cheerio mode (Phase 2: needs headless browser)',
    );
  }
}
