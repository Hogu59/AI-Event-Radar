import { SourceAdapter, type CollectResult, type CollectOptions, type RawEvent } from './types';
import eventusMock from '../../../mocks/eventus.json';
import type { Browser, Page } from 'playwright';

const EVENTUS_SEARCH_URL = 'https://event-us.kr/search';
const USER_AGENT = 'AIEventRadar/0.1 (+https://aieventradar.vercel.app)';
const KEYWORDS = ['AI', 'LLM', 'ML', '머신러닝', '딥러닝', '생성형'];
const MAX_PAGES_PER_KEYWORD = 2;
const MAX_TOTAL = 60;
const PAGE_TIMEOUT_MS = 20_000;
const ADAPTER_TIMEOUT_MS = 90_000;
const DETAIL_CONCURRENCY = 6;

export class EventusAdapter extends SourceAdapter {
  readonly id = 'eventus' as const;
  readonly enabled = process.env.ENABLE_EVENTUS !== 'false';

  async collect(opts?: CollectOptions): Promise<CollectResult> {
    const started_at = this.now();
    const limit = opts?.limit ?? MAX_TOTAL;

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
      const events = await this.withTimeout(
        this.scrape(Math.min(limit, MAX_TOTAL)),
        opts?.timeoutMs ?? ADAPTER_TIMEOUT_MS,
      );
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

  private async scrape(limit: number): Promise<RawEvent[]> {
    const { chromium } = await import('playwright');

    let browser: Browser | null = null;
    const seenIds = new Set<string>();
    const urlsToFetch: { id: string; url: string }[] = [];

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });

      // Phase 1: collect unique event URLs from all keyword search pages.
      for (const keyword of KEYWORDS) {
        if (urlsToFetch.length >= limit) break;
        try {
          const found = await this.collectUrlsForKeyword(browser, keyword);
          for (const f of found) {
            if (seenIds.has(f.id)) continue;
            seenIds.add(f.id);
            urlsToFetch.push(f);
            if (urlsToFetch.length >= limit) break;
          }
        } catch (err) {
          console.warn(
            `[eventus] keyword="${keyword}" failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore
        }
      }
    }

    // Phase 2: fetch detail pages in parallel via plain HTTP (SSR JSON-LD).
    const events: RawEvent[] = [];
    let cursor = 0;
    async function worker(): Promise<void> {
      while (cursor < urlsToFetch.length) {
        const i = cursor++;
        const target = urlsToFetch[i];
        try {
          const ev = await fetchDetail(target.id, target.url);
          if (ev) events.push(ev);
        } catch (err) {
          console.warn(
            `[eventus] detail ${target.id} failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    const workers = Array.from({ length: Math.min(DETAIL_CONCURRENCY, urlsToFetch.length) }, () =>
      worker(),
    );
    await Promise.all(workers);

    return events.slice(0, limit);
  }

  private async collectUrlsForKeyword(
    browser: Browser,
    keyword: string,
  ): Promise<{ id: string; url: string }[]> {
    const found: { id: string; url: string }[] = [];
    const seen = new Set<string>();

    for (let pageNum = 1; pageNum <= MAX_PAGES_PER_KEYWORD; pageNum++) {
      const url =
        `${EVENTUS_SEARCH_URL}?tag=${encodeURIComponent(keyword)}` +
        (pageNum > 1 ? `&page=${pageNum}` : '');

      const context = await browser.newContext({
        userAgent: USER_AGENT,
        locale: 'ko-KR',
        viewport: { width: 1280, height: 1800 },
      });
      const page = await context.newPage();
      try {
        page.setDefaultTimeout(PAGE_TIMEOUT_MS);
        page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        try {
          await page.waitForSelector('a[href*="/event/"]', { timeout: 10_000 });
        } catch {
          // No results for this keyword/page.
        }
        try {
          await page.waitForLoadState('networkidle', { timeout: 4_000 });
        } catch {
          // ignore
        }

        // Trigger any lazy renders.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(800);

        const urls = await extractEventUrls(page);
        if (urls.length === 0) break;

        let addedThisPage = 0;
        for (const u of urls) {
          if (seen.has(u.id)) continue;
          seen.add(u.id);
          found.push(u);
          addedThisPage++;
        }
        // Heuristic: if a page added no new URLs, stop paginating.
        if (addedThisPage === 0) break;
      } finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    }

    return found;
  }
}

async function extractEventUrls(page: Page): Promise<{ id: string; url: string }[]> {
  return page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[href*="/event/"]'),
    ) as HTMLAnchorElement[];
    const seen = new Set<string>();
    const out: { id: string; url: string }[] = [];
    for (const a of anchors) {
      const m = a.href.match(/\/event\/(\d+)/);
      if (!m) continue;
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      try {
        const parsed = new URL(a.href);
        out.push({ id, url: `${parsed.origin}${parsed.pathname}` });
      } catch {
        out.push({ id, url: a.href.split('?')[0] });
      }
    }
    return out;
  });
}

interface JsonLdEvent {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  image?: string | string[];
  eventAttendanceMode?: string;
  location?:
    | { name?: string; address?: string | { addressLocality?: string; streetAddress?: string } }
    | { name?: string; address?: string | { addressLocality?: string; streetAddress?: string } }[];
  organizer?: { name?: string } | { name?: string }[];
  offers?: { price?: string | number; priceCurrency?: string } | { price?: string | number; priceCurrency?: string }[];
}

async function fetchDetail(eventId: string, url: string): Promise<RawEvent | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'user-agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const ld = extractJsonLdEvent(html);
  if (!ld) return null;

  const start = ld.startDate;
  if (!start) return null;

  const startIso = toIso(start);
  if (!startIso) return null;
  const endIso = ld.endDate ? toIso(ld.endDate) ?? undefined : undefined;

  const title = (ld.name ?? '').trim();
  if (!title) return null;

  const description = ld.description ? stripHtml(ld.description).trim() || undefined : undefined;

  const isOnline = /online|virtualeventattendance/i.test(ld.eventAttendanceMode ?? '');
  const locArr = Array.isArray(ld.location) ? ld.location : ld.location ? [ld.location] : [];
  const loc = locArr[0];
  let location_name: string | undefined;
  let city: string | undefined;
  if (loc) {
    location_name = loc.name?.trim() || undefined;
    if (typeof loc.address === 'string') {
      city = loc.address.split(' ')[1];
    } else if (loc.address && typeof loc.address === 'object') {
      city = loc.address.addressLocality?.trim();
      if (!location_name && loc.address.streetAddress) {
        location_name = loc.address.streetAddress.trim();
      }
    }
  }

  const orgArr = Array.isArray(ld.organizer) ? ld.organizer : ld.organizer ? [ld.organizer] : [];
  const host_name = orgArr[0]?.name?.trim() || undefined;

  const offerArr = Array.isArray(ld.offers) ? ld.offers : ld.offers ? [ld.offers] : [];
  let price: string | undefined;
  if (offerArr.length > 0) {
    const prices = offerArr
      .map((o) => (o.price !== undefined ? Number(o.price) : NaN))
      .filter((n) => !Number.isNaN(n));
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === 0 && max === 0) price = '무료';
      else if (min === max) price = `${min.toLocaleString('ko-KR')}원`;
      else price = `${min.toLocaleString('ko-KR')}원 ~ ${max.toLocaleString('ko-KR')}원`;
    }
  }

  const imgArr = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];
  const thumbnail_url = imgArr[0]?.split('?')[0] || undefined;

  const location_type: 'online' | 'offline' = isOnline ? 'online' : 'offline';

  return {
    source: 'eventus',
    source_event_id: `eventus-${eventId}`,
    source_url: url,
    title,
    description,
    start_at: startIso,
    end_at: endIso,
    timezone: 'Asia/Seoul',
    country: 'KR',
    location_type,
    location_name,
    city,
    host_name,
    price,
    thumbnail_url,
  };
}

/**
 * Extract the first schema.org *Event* JSON-LD block from raw HTML.
 * Eventus pages include multiple ld+json blocks (Organization, FAQPage, Event).
 */
export function extractJsonLdEvent(html: string): JsonLdEvent | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      const cand = node as JsonLdEvent;
      const t = cand['@type'];
      const typeStr = Array.isArray(t) ? t.join(',') : t ?? '';
      if (/Event/i.test(typeStr)) return cand;
    }
  }
  return null;
}

function toIso(s: string): string | null {
  // ISO8601 strings from schema.org are already valid.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}
