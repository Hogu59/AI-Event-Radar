import { getBrowserSupabase } from './supabase';
import type {
  ApiResponse,
  Bookmark,
  DigestFrequency,
  Event,
  EventFiltersState,
  EventListResponse,
  NotificationChannel,
  Pagination,
  SourceRunLog,
  Subscription,
  User,
} from './types';
import { filtersToSearchParams } from './filters';
import { MOCK_BOOKMARKS, MOCK_EVENTS, MOCK_SOURCE_RUN_LOGS, MOCK_SUBSCRIPTIONS } from './mock-data';

/** Mock mode toggles. Defaults to true when Supabase env is missing. */
export function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') return true;
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'false') return false;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(opts: { code: string; message: string; status: number; details?: unknown }) {
    super(opts.message);
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function getAccessToken(): Promise<string | null> {
  const supa = getBrowserSupabase();
  if (!supa) return null;
  const { data } = await supa.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: 'include',
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON response
  }

  if (!res.ok || !payload || payload.ok === false) {
    const err = payload && payload.ok === false ? payload.error : null;
    throw new ApiError({
      code: err?.code ?? 'INTERNAL_ERROR',
      message: err?.message ?? `요청에 실패했습니다 (${res.status})`,
      status: res.status,
      details: err?.details,
    });
  }

  return payload.data;
}

// ============================================================================
// MOCK IMPLEMENTATIONS (used when isMockMode())
// ============================================================================

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; pagination: Pagination } {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), total_pages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: { page: safePage, page_size: pageSize, total, total_pages },
  };
}

function filterMockEvents(filters: EventFiltersState): Event[] {
  let list = [...MOCK_EVENTS];
  if (filters.is_ai_related !== false) {
    list = list.filter((e) => e.is_ai_related);
  }
  if (filters.q && filters.q.trim()) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.host_name ?? '').toLowerCase().includes(q) ||
        e.keywords_matched.some((k) => k.toLowerCase().includes(q)) ||
        e.categories.some((c) => c.toLowerCase().includes(q)),
    );
  }
  if (filters.sources?.length) {
    const set = new Set(filters.sources);
    list = list.filter((e) => set.has(e.source));
  }
  if (filters.location_types?.length) {
    const set = new Set(filters.location_types);
    list = list.filter((e) => e.location_type && set.has(e.location_type));
  }
  if (filters.cities?.length) {
    const set = new Set(filters.cities.map((c) => c.toLowerCase()));
    list = list.filter((e) => e.city && set.has(e.city.toLowerCase()));
  }
  if (filters.categories?.length) {
    const set = new Set(filters.categories.map((c) => c.toLowerCase()));
    list = list.filter((e) => e.categories.some((c) => set.has(c.toLowerCase())));
  }
  if (filters.start_after) {
    const after = new Date(filters.start_after).getTime();
    list = list.filter((e) => new Date(e.start_at).getTime() >= after);
  }
  if (filters.start_before) {
    const before = new Date(filters.start_before).getTime();
    list = list.filter((e) => new Date(e.start_at).getTime() <= before);
  }
  const sort = filters.sort ?? 'start_at_asc';
  list.sort((a, b) => {
    if (sort === 'start_at_desc') return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
    if (sort === 'collected_at_desc') return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime();
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });
  return list;
}

async function mockDelay<T>(value: T, ms = 220): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  return value;
}

const MOCK_USER: User = {
  id: 'mock-user',
  email: 'demo@aieventradar.app',
  display_name: 'Demo',
  auth_provider: 'email',
  role: 'user',
  notification_channel: 'email',
  digest_frequency: 'weekly',
  created_at: new Date().toISOString(),
  last_active_at: new Date().toISOString(),
};

// In-memory mutable mock state (browser session only)
const mockState = {
  bookmarks: [...MOCK_BOOKMARKS],
  subscriptions: [...MOCK_SUBSCRIPTIONS],
  user: { ...MOCK_USER },
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const api = {
  async listEvents(filters: EventFiltersState = {}): Promise<EventListResponse> {
    if (isMockMode()) {
      const all = filterMockEvents(filters);
      const page = filters.page ?? 1;
      const pageSize = filters.page_size ?? 20;
      const { items, pagination } = paginate(all, page, pageSize);
      return mockDelay({ events: items, pagination });
    }
    const sp = filtersToSearchParams(filters);
    return request<EventListResponse>(`/api/events?${sp.toString()}`);
  },

  async getEvent(id: string): Promise<Event> {
    if (isMockMode()) {
      const event = MOCK_EVENTS.find((e) => e.id === id);
      if (!event) {
        throw new ApiError({ code: 'NOT_FOUND', message: '행사를 찾을 수 없습니다.', status: 404 });
      }
      const isBookmarked = mockState.bookmarks.some((b) => b.event_id === id);
      return mockDelay({ ...event, is_bookmarked: isBookmarked });
    }
    const data = await request<{ event: Event }>(`/api/events/${id}`);
    return data.event;
  },

  async listBookmarks(): Promise<Bookmark[]> {
    if (isMockMode()) {
      return mockDelay(
        mockState.bookmarks.map((b) => ({
          ...b,
          event: MOCK_EVENTS.find((e) => e.id === b.event_id) ?? b.event,
        })),
      );
    }
    const data = await request<{ bookmarks: Bookmark[] }>('/api/bookmarks');
    return data.bookmarks;
  },

  async addBookmark(event_id: string, note?: string | null): Promise<Bookmark> {
    if (isMockMode()) {
      const existing = mockState.bookmarks.find((b) => b.event_id === event_id);
      if (existing) {
        throw new ApiError({ code: 'CONFLICT', message: '이미 북마크되어 있어요.', status: 409 });
      }
      const bookmark: Bookmark = {
        id: `bm-${Date.now()}`,
        event_id,
        event: MOCK_EVENTS.find((e) => e.id === event_id),
        note: note ?? null,
        created_at: new Date().toISOString(),
      };
      mockState.bookmarks.unshift(bookmark);
      return mockDelay(bookmark);
    }
    const data = await request<{ bookmark: Bookmark }>('/api/bookmarks', {
      method: 'POST',
      body: { event_id, note },
    });
    return data.bookmark;
  },

  async removeBookmark(id: string): Promise<void> {
    if (isMockMode()) {
      mockState.bookmarks = mockState.bookmarks.filter((b) => b.id !== id);
      await mockDelay(null);
      return;
    }
    await request<{ deleted: true }>(`/api/bookmarks/${id}`, { method: 'DELETE' });
  },

  async listSubscriptions(): Promise<Subscription[]> {
    if (isMockMode()) {
      return mockDelay([...mockState.subscriptions]);
    }
    const data = await request<{ subscriptions: Subscription[] }>('/api/subscriptions');
    return data.subscriptions;
  },

  async createSubscription(input: Omit<Subscription, 'id' | 'is_active' | 'created_at' | 'user_id'> & {
    is_active?: boolean;
  }): Promise<Subscription> {
    if (isMockMode()) {
      const sub: Subscription = {
        id: `sub-${Date.now()}`,
        name: input.name,
        keywords: input.keywords,
        sources: input.sources ?? null,
        location_types: input.location_types ?? null,
        cities: input.cities ?? null,
        notify_on_new: input.notify_on_new ?? true,
        notify_on_deadline: input.notify_on_deadline ?? true,
        is_active: input.is_active ?? true,
        created_at: new Date().toISOString(),
      };
      mockState.subscriptions.unshift(sub);
      return mockDelay(sub);
    }
    const data = await request<{ subscription: Subscription }>('/api/subscriptions', {
      method: 'POST',
      body: input,
    });
    return data.subscription;
  },

  async updateSubscription(id: string, patch: Partial<Subscription>): Promise<Subscription> {
    if (isMockMode()) {
      const idx = mockState.subscriptions.findIndex((s) => s.id === id);
      if (idx < 0) {
        throw new ApiError({ code: 'NOT_FOUND', message: '구독을 찾을 수 없습니다.', status: 404 });
      }
      mockState.subscriptions[idx] = { ...mockState.subscriptions[idx], ...patch };
      return mockDelay(mockState.subscriptions[idx]);
    }
    const data = await request<{ subscription: Subscription }>(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      body: patch,
    });
    return data.subscription;
  },

  async deleteSubscription(id: string): Promise<void> {
    if (isMockMode()) {
      mockState.subscriptions = mockState.subscriptions.filter((s) => s.id !== id);
      await mockDelay(null);
      return;
    }
    await request<{ deleted: true }>(`/api/subscriptions/${id}`, { method: 'DELETE' });
  },

  async listSourceRuns(): Promise<{ runs: SourceRunLog[]; stats_24h: { total_runs: number; successful: number; failed: number; total_new_events: number } }> {
    if (isMockMode()) {
      return mockDelay({
        runs: MOCK_SOURCE_RUN_LOGS,
        stats_24h: {
          total_runs: MOCK_SOURCE_RUN_LOGS.length,
          successful: MOCK_SOURCE_RUN_LOGS.filter((r) => r.status === 'success').length,
          failed: MOCK_SOURCE_RUN_LOGS.filter((r) => r.status === 'failed').length,
          total_new_events: MOCK_SOURCE_RUN_LOGS.reduce((acc, r) => acc + r.events_new, 0),
        },
      });
    }
    return request('/api/admin/source-runs');
  },

  async retrySource(source: string): Promise<void> {
    if (isMockMode()) {
      await mockDelay(null, 600);
      return;
    }
    await request('/api/admin/source-runs/retry', { method: 'POST', body: { source } });
  },

  async getMe(): Promise<User> {
    if (isMockMode()) {
      return mockDelay({ ...mockState.user });
    }
    const data = await request<{ user: User }>('/api/users/me');
    return data.user;
  },

  async updateMe(patch: {
    display_name?: string | null;
    digest_frequency?: DigestFrequency;
    notification_channel?: NotificationChannel;
  }): Promise<User> {
    if (isMockMode()) {
      mockState.user = { ...mockState.user, ...patch } as User;
      return mockDelay({ ...mockState.user });
    }
    const data = await request<{ user: User }>('/api/users/me', {
      method: 'PATCH',
      body: patch,
    });
    return data.user;
  },

  async requestMagicLink(email: string, redirect_to?: string): Promise<void> {
    if (isMockMode()) {
      await mockDelay(null, 400);
      return;
    }
    await request('/api/auth/login', { method: 'POST', body: { email, redirect_to } });
  },
};
