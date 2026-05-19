export interface SubscriptionRow {
  id: string;
  user_id: string;
  name: string;
  keywords: string[];
  sources: string[] | null;
  location_types: string[] | null;
  cities: string[] | null;
  notify_on_new: boolean;
  notify_on_deadline: boolean;
  is_active: boolean;
}

export interface EventRow {
  id: string;
  source: string;
  title: string;
  description: string | null;
  start_at: string;
  city: string | null;
  location_type: string | null;
  host_name: string | null;
  price: string | null;
  keywords_matched: string[];
  source_url: string;
}

/**
 * True when `event` matches `sub` rule semantics:
 *   - At least one keyword in sub.keywords is present in event.keywords_matched or in title/description
 *   - sub.sources null/empty OR event.source in sub.sources
 *   - sub.location_types null/empty OR event.location_type in sub.location_types
 *   - sub.cities null/empty OR event.city in sub.cities
 */
export function matchSubscription(sub: SubscriptionRow, event: EventRow): boolean {
  if (sub.sources && sub.sources.length > 0 && !sub.sources.includes(event.source)) return false;
  if (
    sub.location_types &&
    sub.location_types.length > 0 &&
    (!event.location_type || !sub.location_types.includes(event.location_type))
  )
    return false;
  if (
    sub.cities &&
    sub.cities.length > 0 &&
    (!event.city || !sub.cities.includes(event.city))
  )
    return false;

  if (!sub.keywords || sub.keywords.length === 0) return true;

  const haystack = [
    event.title,
    event.description ?? '',
    event.keywords_matched.join(' '),
  ]
    .join('\n')
    .toLowerCase()
    .normalize('NFKC');

  return sub.keywords.some((kw) => haystack.includes(kw.toLowerCase().normalize('NFKC')));
}

export function pickMatchingEvents(sub: SubscriptionRow, events: EventRow[]): EventRow[] {
  return events.filter((e) => matchSubscription(sub, e));
}
