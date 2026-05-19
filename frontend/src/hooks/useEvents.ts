'use client';

import * as React from 'react';
import { api, ApiError } from '@/lib/api';
import type { Event, EventFiltersState, Pagination } from '@/lib/types';

interface UseEventsResult {
  events: Event[];
  pagination: Pagination | null;
  loading: boolean;
  initialLoading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useEvents(filters: EventFiltersState): UseEventsResult {
  // Stable JSON key for effect deps without depending on object identity
  const key = React.useMemo(() => JSON.stringify({ ...filters, page: undefined }), [filters]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [page, setPage] = React.useState(filters.page ?? 1);
  const [loading, setLoading] = React.useState(true);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const reqRef = React.useRef(0);

  // Reset when filter key changes
  React.useEffect(() => {
    setEvents([]);
    setPagination(null);
    setPage(1);
    setInitialLoading(true);
  }, [key]);

  const fetchPage = React.useCallback(
    async (targetPage: number, append: boolean) => {
      const reqId = ++reqRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await api.listEvents({ ...filters, page: targetPage });
        if (reqId !== reqRef.current) return; // stale
        setPagination(data.pagination);
        setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
      } catch (e) {
        if (reqId !== reqRef.current) return;
        setError(e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL_ERROR', message: '불러오기 실패', status: 500 }));
      } finally {
        if (reqId === reqRef.current) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  React.useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = React.useCallback(() => {
    if (loading || !pagination) return;
    if (page >= pagination.total_pages) return;
    const next = page + 1;
    setPage(next);
    void fetchPage(next, true);
  }, [loading, pagination, page, fetchPage]);

  const refresh = React.useCallback(() => {
    setPage(1);
    void fetchPage(1, false);
  }, [fetchPage]);

  const hasMore = pagination ? page < pagination.total_pages : false;

  return { events, pagination, loading, initialLoading, error, hasMore, loadMore, refresh };
}
