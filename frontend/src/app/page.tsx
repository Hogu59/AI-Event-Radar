import { Suspense } from 'react';
import Link from 'next/link';
import { EventList } from '@/components/EventList';
import { EventFilters } from '@/components/EventFilters';
import { EventListSkeleton } from '@/components/LoadingSpinner';
import { filtersFromSearchParams } from '@/lib/filters';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ArrowRight, Bell, Filter, Radar } from 'lucide-react';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filters = filtersFromSearchParams(params);
  const hasFilters = Boolean(
    filters.q ||
      filters.sources?.length ||
      filters.categories?.length ||
      filters.cities?.length ||
      filters.location_types?.length,
  );

  return (
    <>
      {!hasFilters ? <Hero /> : null}

      <section className="container py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2 lg:scrollbar-thin">
            <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-muted/40" />}>
              <EventFilters />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<EventListSkeleton />}>
              <EventList filters={filters} />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-radar-grid">
      <div className="container relative grid grid-cols-1 items-center gap-8 py-12 md:grid-cols-[1fr_auto] md:py-16">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Radar className="h-3.5 w-3.5" />
            Festa · 이벤터스 · Luma · Dev-Event · Devpost
          </span>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            AI 행사 한 곳에서,
            <br />
            <span className="text-primary">놓치지 않게.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            5개 플랫폼을 매일 돌아다닐 필요 없어요. 흩어진 AI 컨퍼런스/밋업/해커톤을 자동 수집하고,
            <br className="hidden sm:inline" />
            관심 키워드에 맞춰 알림을 보내드려요.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="lg" className="gap-2">
              <Link href="/my/subscriptions">
                <Bell className="h-4 w-4" />
                키워드 구독 만들기
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="#events">
                <Filter className="h-4 w-4" />
                바로 둘러보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Dot /> 가입 없이 열람 가능</li>
            <li className="flex items-center gap-2"><Dot /> KST 기준 표시</li>
            <li className="flex items-center gap-2"><Dot /> D-3 마감 알림</li>
          </ul>
        </div>
        <div className="hidden md:block">
          <Logo size={220} className="text-primary opacity-70" />
        </div>
      </div>
      <div id="events" className="absolute -bottom-0 h-px w-full" aria-hidden />
    </section>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />;
}
