'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, ExternalLink, MapPin, Tag, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SourceBadge } from '@/components/SourceBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { BookmarkButton } from '@/components/BookmarkButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { api, ApiError } from '@/lib/api';
import type { Event } from '@/lib/types';
import { formatDateRange, formatLocation, formatPrice, relativeDateLabel, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [event, setEvent] = React.useState<Event | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getEvent(id)
      .then((e) => {
        if (!cancelled) setEvent(e);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError({ code: 'INTERNAL_ERROR', message: '행사 정보를 불러오지 못했어요.', status: 500 }),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container py-16">
        <LoadingSpinner label="행사 정보를 불러오는 중..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          title={error?.code === 'NOT_FOUND' ? '행사를 찾을 수 없어요' : '문제가 발생했어요'}
          description={error?.message}
          action={
            <Button asChild variant="outline">
              <Link href="/">전체 행사로 돌아가기</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const rel = relativeDateLabel(event.start_at);

  return (
    <article className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> 뒤로
        </Button>
        <BookmarkButton eventId={event.id} variant="pill" initialBookmarked={event.is_bookmarked} />
      </div>

      <header className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={event.source} />
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                rel.tone === 'today' && 'border-destructive/30 bg-destructive/10 text-destructive',
                rel.tone !== 'today' && 'border-primary/30 bg-primary/10 text-primary',
              )}
            >
              {rel.label}
            </span>
            {event.is_ai_related ? (
              <span className="inline-flex items-center rounded-full border border-cat-ai/30 bg-cat-ai/10 px-2 py-0.5 text-xs font-semibold text-cat-ai">
                AI 관련
              </span>
            ) : null}
          </div>
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {event.title}
          </h1>
          {event.description ? (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85">{event.description}</p>
          ) : null}
        </div>

        <aside className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-5">
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="일정">
                <span className="text-sm font-medium">{formatDateRange(event.start_at, event.end_at)}</span>
              </DetailRow>
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="장소">
                <span className="text-sm">{formatLocation(event)}</span>
                {event.location_name && event.location_name !== formatLocation(event) ? (
                  <span className="block text-xs text-muted-foreground">{event.location_name}</span>
                ) : null}
              </DetailRow>
              {event.host_name ? (
                <DetailRow icon={<Users className="h-4 w-4" />} label="호스트">
                  <span className="text-sm">{event.host_name}</span>
                </DetailRow>
              ) : null}
              <DetailRow icon={<Tag className="h-4 w-4" />} label="가격">
                <span className="text-sm">{formatPrice(event.price)}</span>
              </DetailRow>
            </CardContent>
          </Card>

          <Button asChild size="lg" className="w-full gap-2">
            <a href={event.source_url} target="_blank" rel="noopener noreferrer">
              원본 페이지에서 신청
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            수집 시점: {timeAgo(event.collected_at)}
          </p>
        </aside>
      </header>

      {event.categories.length > 0 ? (
        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            카테고리
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {event.categories.map((c) => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>
        </section>
      ) : null}

      {event.keywords_matched.length > 0 ? (
        <section className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            매칭된 AI 키워드
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {event.keywords_matched.map((k) => (
              <span
                key={k}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {k}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}
