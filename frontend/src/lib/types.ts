// Domain types mirrored from docs/DATABASE.md & docs/API_SPEC.md.
// Kept independent from backend so frontend can build standalone.

export type SourceId = 'festa' | 'eventus' | 'luma' | 'dev_event' | 'devpost';

export type LocationType = 'online' | 'offline' | 'hybrid';

export type AuthProvider = 'email' | 'google';

export type NotificationChannel = 'email';

export type DigestFrequency = 'realtime' | 'daily' | 'weekly' | 'off';

export type RunStatus = 'success' | 'partial' | 'failed';

export type UserRole = 'user' | 'admin';

export interface Event {
  id: string;
  source: SourceId;
  source_event_id?: string;
  source_url: string;
  title: string;
  description?: string | null;
  start_at: string; // ISO8601
  end_at?: string | null;
  timezone?: string | null;
  location_type?: LocationType | null;
  location_name?: string | null;
  city?: string | null;
  country?: string | null;
  host_name?: string | null;
  price?: string | null;
  categories: string[];
  keywords_matched: string[];
  thumbnail_url?: string | null;
  is_ai_related: boolean;
  collected_at: string;
  updated_at?: string;
  is_bookmarked?: boolean;
}

export interface User {
  id: string;
  email: string;
  display_name?: string | null;
  auth_provider: AuthProvider;
  role: UserRole;
  notification_channel: NotificationChannel;
  digest_frequency: DigestFrequency;
  created_at: string;
  last_active_at?: string | null;
}

export interface Subscription {
  id: string;
  user_id?: string;
  name: string;
  keywords: string[];
  sources: SourceId[] | null;
  location_types: LocationType[] | null;
  cities: string[] | null;
  notify_on_new: boolean;
  notify_on_deadline: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id?: string;
  event_id: string;
  event?: Event;
  note?: string | null;
  created_at: string;
}

export interface SourceRunLog {
  id: string;
  source: SourceId;
  started_at: string;
  finished_at?: string | null;
  status: RunStatus;
  events_collected: number;
  events_new: number;
  events_updated: number;
  error_message?: string | null;
  triggered_by?: 'cron' | 'manual';
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface EventListResponse {
  events: Event[];
  pagination: Pagination;
}

export interface EventFiltersState {
  q?: string;
  sources?: SourceId[];
  location_types?: LocationType[];
  cities?: string[];
  categories?: string[];
  start_after?: string;
  start_before?: string;
  is_ai_related?: boolean;
  sort?: 'start_at_asc' | 'start_at_desc' | 'collected_at_desc';
  page?: number;
  page_size?: number;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

export const SOURCE_LABELS: Record<SourceId, string> = {
  festa: 'Festa',
  eventus: '이벤터스',
  luma: 'Luma',
  dev_event: 'Dev-Event',
  devpost: 'Devpost',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  online: '온라인',
  offline: '오프라인',
  hybrid: '하이브리드',
};

export const DIGEST_FREQUENCY_LABELS: Record<DigestFrequency, string> = {
  realtime: '실시간 (수집 직후)',
  daily: '매일 다이제스트',
  weekly: '주간 다이제스트',
  off: '받지 않기',
};

export const SOURCE_IDS: SourceId[] = ['festa', 'eventus', 'luma', 'dev_event', 'devpost'];
export const LOCATION_TYPES: LocationType[] = ['offline', 'online', 'hybrid'];

// Canonical category palette. Categories from data may be mixed-case (e.g. "LLM", "Hackathon")
// so we normalise via toLowerCase() at the call-site.
export interface CategoryStyle {
  label: string;
  className: string; // tailwind classes for badge
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  llm: { label: 'LLM', className: 'bg-cat-llm/15 text-cat-llm border-cat-llm/30' },
  agent: { label: 'Agent', className: 'bg-cat-agent/15 text-cat-agent border-cat-agent/30' },
  rag: { label: 'RAG', className: 'bg-cat-rag/15 text-cat-rag border-cat-rag/30' },
  mlops: { label: 'MLOps', className: 'bg-cat-mlops/15 text-cat-mlops border-cat-mlops/30' },
  hackathon: { label: 'Hackathon', className: 'bg-cat-hackathon/15 text-cat-hackathon border-cat-hackathon/30' },
  meetup: { label: 'Meetup', className: 'bg-cat-meetup/15 text-cat-meetup border-cat-meetup/30' },
  vision: { label: 'Vision', className: 'bg-cat-vision/15 text-cat-vision border-cat-vision/30' },
  ai: { label: 'AI', className: 'bg-cat-ai/15 text-cat-ai border-cat-ai/30' },
};

export function categoryStyleFor(category: string): CategoryStyle {
  const key = category.trim().toLowerCase();
  return (
    CATEGORY_STYLES[key] ?? {
      label: category,
      className: 'bg-muted text-muted-foreground border-border',
    }
  );
}

export const SOURCE_BADGE_CLASS: Record<SourceId, string> = {
  festa: 'bg-src-festa/12 text-src-festa border-src-festa/30',
  eventus: 'bg-src-eventus/12 text-src-eventus border-src-eventus/30',
  luma: 'bg-src-luma/12 text-src-luma border-src-luma/30',
  dev_event: 'bg-src-devevent/12 text-src-devevent border-src-devevent/30',
  devpost: 'bg-src-devpost/12 text-src-devpost border-src-devpost/30',
};
