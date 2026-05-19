'use client';

import * as React from 'react';
import Link from 'next/link';
import { EventCard } from '@/components/EventCard';
import { EventListSkeleton } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import type { EventFiltersState } from '@/lib/types';
import { AlertCircle, Inbox, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface EventListProps {
  filters: EventFiltersState;
}

export function EventList({ filters }: EventListProps) {
  const { events, pagination, initialLoading, loading, error, hasMore, loadMore, refresh } = useEvents(filters);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Infinite scroll
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  if (initialLoading) {
    return <EventListSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6" />}
        title="행사를 불러오지 못했어요"
        description={error.message}
        action={
          <Button onClick={refresh} size="sm">
            다시 시도
          </Button>
        }
      />
    );
  }

  if (!events.length) {
    return (
      <EmptyState
        icon={<Inbox className="h-6 w-6" />}
        title="조건에 맞는 행사가 없어요"
        description="키워드를 바꿔보거나 구독을 만들어 새 행사가 등록되면 알림을 받아보세요."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/">필터 초기화</Link>
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link href="/my/subscriptions">
                <Sparkles className="h-4 w-4" />
                구독 만들기
              </Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            총 <span className="font-semibold text-foreground tabular-nums">{pagination?.total ?? events.length}</span>개 행사
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
        <div ref={sentinelRef} aria-hidden className="h-1" />
        {hasMore ? (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? '불러오는 중...' : '더 보기'}
            </Button>
          </div>
        ) : loading ? (
          <LoadingSpinner className="mt-6" label="불러오는 중..." />
        ) : null}
        {!hasMore && events.length > 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">모든 결과를 표시했어요.</p>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
