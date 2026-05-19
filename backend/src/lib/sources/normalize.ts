import crypto from 'node:crypto';
import type { RawEvent, NormalizedEvent } from './types';
import { classifyEvent } from './ai-classifier';

function normalizeForHash(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\s\p{P}]+/gu, '');
}

function dateBucket(startAt: Date): string {
  if (Number.isNaN(startAt.getTime())) return '';
  return startAt.toISOString().slice(0, 10);
}

export function buildDedupeHash(input: {
  title: string;
  start_at: string;
  city?: string | null;
  location_name?: string | null;
  source?: string;
  source_event_id?: string;
}): string {
  const start = new Date(input.start_at);
  const locationKey = input.city || input.location_name || '';
  const key = [
    normalizeForHash(input.title),
    dateBucket(start),
    normalizeForHash(locationKey),
  ].join('|');

  // Fallback: if title/date/location are all empty, fall back to source+sourceEventId
  // so we never produce duplicate empty hashes across sources.
  const isEmpty = key.replaceAll('|', '').length === 0;
  const finalKey = isEmpty && input.source && input.source_event_id
    ? `${input.source}:${input.source_event_id}`
    : key;

  return crypto.createHash('sha256').update(finalKey).digest('hex');
}

function clampTimezone(tz?: string): string {
  return tz && tz.length > 0 ? tz : 'Asia/Seoul';
}

export function normalize(raw: RawEvent): NormalizedEvent {
  const classified = classifyEvent({
    title: raw.title,
    description: raw.description,
    raw_categories: raw.raw_categories,
    host_name: raw.host_name,
  });

  return {
    source: raw.source,
    source_event_id: raw.source_event_id,
    source_url: raw.source_url,
    title: raw.title.trim(),
    description: raw.description?.trim() ?? null,
    start_at: new Date(raw.start_at).toISOString(),
    end_at: raw.end_at ? new Date(raw.end_at).toISOString() : null,
    timezone: clampTimezone(raw.timezone),
    location_type: raw.location_type ?? null,
    location_name: raw.location_name?.trim() ?? null,
    city: raw.city?.trim() ?? null,
    country: raw.country?.trim() ?? null,
    host_name: raw.host_name?.trim() ?? null,
    price: raw.price?.trim() ?? null,
    categories: classified.categories,
    keywords_matched: classified.keywords_matched,
    thumbnail_url: raw.thumbnail_url ?? null,
    dedupe_hash: buildDedupeHash({
      title: raw.title,
      start_at: raw.start_at,
      city: raw.city,
      location_name: raw.location_name,
      source: raw.source,
      source_event_id: raw.source_event_id,
    }),
    is_ai_related: classified.is_ai_related,
  };
}
