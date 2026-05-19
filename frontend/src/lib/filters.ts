import type { EventFiltersState, LocationType, SourceId } from './types';
import { LOCATION_TYPES, SOURCE_IDS } from './types';

const ALLOWED_SORT = ['start_at_asc', 'start_at_desc', 'collected_at_desc'] as const;

type SortValue = (typeof ALLOWED_SORT)[number];

function parseCsv<T extends string>(value: string | null, allowed?: readonly T[]): T[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  if (allowed) {
    const set = new Set<string>(allowed);
    const filtered = parts.filter((p): p is T => set.has(p));
    return filtered.length > 0 ? filtered : undefined;
  }
  return parts as T[];
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parseInt10(value: string | null, fallback?: number): number | undefined {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function filtersFromSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): EventFiltersState {
  const getter = (k: string): string | null => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(k);
    const raw = searchParams[k];
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  };

  const sortRaw = getter('sort');
  const sort: SortValue | undefined = (ALLOWED_SORT as readonly string[]).includes(sortRaw ?? '')
    ? (sortRaw as SortValue)
    : undefined;

  const isAi = parseBoolean(getter('is_ai_related'));

  return {
    q: getter('q') || undefined,
    sources: parseCsv<SourceId>(getter('sources'), SOURCE_IDS),
    location_types: parseCsv<LocationType>(getter('location_types'), LOCATION_TYPES),
    cities: parseCsv(getter('cities')),
    categories: parseCsv(getter('categories')),
    start_after: getter('start_after') || undefined,
    start_before: getter('start_before') || undefined,
    is_ai_related: isAi,
    sort,
    page: parseInt10(getter('page'), 1),
    page_size: parseInt10(getter('page_size'), 20),
  };
}

export function filtersToSearchParams(filters: EventFiltersState): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q) sp.set('q', filters.q);
  if (filters.sources?.length) sp.set('sources', filters.sources.join(','));
  if (filters.location_types?.length) sp.set('location_types', filters.location_types.join(','));
  if (filters.cities?.length) sp.set('cities', filters.cities.join(','));
  if (filters.categories?.length) sp.set('categories', filters.categories.join(','));
  if (filters.start_after) sp.set('start_after', filters.start_after);
  if (filters.start_before) sp.set('start_before', filters.start_before);
  if (typeof filters.is_ai_related === 'boolean') {
    sp.set('is_ai_related', String(filters.is_ai_related));
  }
  if (filters.sort) sp.set('sort', filters.sort);
  if (filters.page && filters.page !== 1) sp.set('page', String(filters.page));
  if (filters.page_size && filters.page_size !== 20) sp.set('page_size', String(filters.page_size));
  return sp;
}

export function filtersToQueryString(filters: EventFiltersState): string {
  const sp = filtersToSearchParams(filters);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function isEmptyFilters(filters: EventFiltersState): boolean {
  return (
    !filters.q &&
    !filters.sources?.length &&
    !filters.location_types?.length &&
    !filters.cities?.length &&
    !filters.categories?.length &&
    !filters.start_after &&
    !filters.start_before
  );
}
