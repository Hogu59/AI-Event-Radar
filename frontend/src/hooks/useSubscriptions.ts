'use client';

import * as React from 'react';
import { api, ApiError } from '@/lib/api';
import type { Subscription } from '@/lib/types';

export interface UseSubscriptionsResult {
  subscriptions: Subscription[];
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  create: (input: Parameters<typeof api.createSubscription>[0]) => Promise<Subscription>;
  update: (id: string, patch: Partial<Subscription>) => Promise<Subscription>;
  remove: (id: string) => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsResult {
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSubscriptions();
      setSubscriptions(data);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL_ERROR', message: '구독 로드 실패', status: 500 }));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create: UseSubscriptionsResult['create'] = React.useCallback(async (input) => {
    const created = await api.createSubscription(input);
    setSubscriptions((prev) => [created, ...prev]);
    return created;
  }, []);

  const update: UseSubscriptionsResult['update'] = React.useCallback(async (id, patch) => {
    const updated = await api.updateSubscription(id, patch);
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const remove: UseSubscriptionsResult['remove'] = React.useCallback(async (id) => {
    await api.deleteSubscription(id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { subscriptions, loading, error, refresh, create, update, remove };
}
