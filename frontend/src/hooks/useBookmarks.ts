'use client';

import * as React from 'react';
import { api, ApiError } from '@/lib/api';
import type { Bookmark } from '@/lib/types';

interface UseBookmarksResult {
  bookmarks: Bookmark[];
  bookmarkByEventId: Record<string, Bookmark>;
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  toggle: (eventId: string, note?: string | null) => Promise<{ added: boolean }>;
  remove: (id: string) => Promise<void>;
}

export function useBookmarks(): UseBookmarksResult {
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listBookmarks();
      setBookmarks(data);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL_ERROR', message: '북마크 로드 실패', status: 500 }));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const bookmarkByEventId = React.useMemo(() => {
    const map: Record<string, Bookmark> = {};
    bookmarks.forEach((b) => {
      map[b.event_id] = b;
    });
    return map;
  }, [bookmarks]);

  const toggle = React.useCallback(
    async (eventId: string, note?: string | null) => {
      const existing = bookmarkByEventId[eventId];
      if (existing) {
        await api.removeBookmark(existing.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
        return { added: false };
      }
      const created = await api.addBookmark(eventId, note);
      setBookmarks((prev) => [created, ...prev]);
      return { added: true };
    },
    [bookmarkByEventId],
  );

  const remove = React.useCallback(async (id: string) => {
    await api.removeBookmark(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { bookmarks, bookmarkByEventId, loading, error, refresh, toggle, remove };
}
