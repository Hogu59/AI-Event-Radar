'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, Settings2, Mail, ArrowRight, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettings } from '@/components/NotificationSettings';
import { useAuth } from '@/context/AuthContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { api, ApiError, isMockMode } from '@/lib/api';
import type { DigestFrequency, User } from '@/lib/types';
import { DIGEST_FREQUENCY_LABELS, SOURCE_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';

export default function MyPage() {
  const { user } = useAuth();
  const { bookmarks, loading: bmLoading } = useBookmarks();
  const { subscriptions, loading: subLoading } = useSubscriptions();
  const { toast } = useToast();
  const [me, setMe] = React.useState<User | null>(null);
  const [meLoading, setMeLoading] = React.useState(true);
  const [digest, setDigest] = React.useState<DigestFrequency>('weekly');
  const [savingDigest, setSavingDigest] = React.useState(false);

  const shouldLoadMe = Boolean(user) || isMockMode();

  React.useEffect(() => {
    if (!shouldLoadMe) {
      setMeLoading(false);
      return;
    }
    let cancelled = false;
    setMeLoading(true);
    api
      .getMe()
      .then((u) => {
        if (cancelled) return;
        setMe(u);
        setDigest(u.digest_frequency);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : '사용자 정보를 불러오지 못했어요.';
        toast({ title: '불러오기 실패', description: message, variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setMeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoadMe, toast]);

  const handleChangeFrequency = React.useCallback(
    async (next: DigestFrequency) => {
      const previous = digest;
      if (next === previous) return;
      setDigest(next);
      setSavingDigest(true);
      try {
        const updated = await api.updateMe({ digest_frequency: next });
        setMe(updated);
        setDigest(updated.digest_frequency);
        toast({ title: '알림 빈도가 저장되었어요', description: DIGEST_FREQUENCY_LABELS[updated.digest_frequency] });
      } catch (err) {
        setDigest(previous);
        const message = err instanceof ApiError ? err.message : '저장에 실패했어요. 다시 시도해주세요.';
        toast({ title: '저장 실패', description: message, variant: 'destructive' });
      } finally {
        setSavingDigest(false);
      }
    },
    [digest, toast],
  );

  if (!user && !isMockMode()) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="마이페이지를 이용하려면 로그인이 필요해요"
          description="이메일 1분 가입으로 북마크와 키워드 구독을 사용할 수 있어요."
          action={
            <Button asChild>
              <Link href="/login?redirect_to=/my">이메일로 로그인</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const displayEmail = me?.email ?? user?.email ?? 'demo@aieventradar.app';

  return (
    <div className="container py-8 lg:py-10">
      <header className="mb-8 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">마이페이지</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">안녕하세요{user ? `, ${displayEmail.split('@')[0]}` : ''}</h1>
        <p className="text-sm text-muted-foreground">{displayEmail}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Bookmark className="h-4 w-4" />}
          label="북마크"
          value={bookmarks.length}
          href="/my/bookmarks"
          accent="primary"
        />
        <StatCard
          icon={<Settings2 className="h-4 w-4" />}
          label="구독"
          value={subscriptions.filter((s) => s.is_active).length}
          href="/my/subscriptions"
          accent="accent"
        />
        <StatCard
          icon={<Bell className="h-4 w-4" />}
          label="알림"
          value={DIGEST_FREQUENCY_LABELS[digest]}
          accent="muted"
        />
      </div>

      <Tabs defaultValue="bookmarks" className="mt-8">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="bookmarks">북마크</TabsTrigger>
          <TabsTrigger value="subscriptions">구독</TabsTrigger>
          <TabsTrigger value="notifications">알림</TabsTrigger>
        </TabsList>

        <TabsContent value="bookmarks" className="space-y-4">
          {bmLoading ? (
            <LoadingSpinner label="불러오는 중..." />
          ) : bookmarks.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="h-6 w-6" />}
              title="아직 북마크한 행사가 없어요"
              description="관심 가는 행사를 카드 우측 상단의 북마크 버튼으로 저장해보세요."
              action={
                <Button asChild>
                  <Link href="/">행사 둘러보기</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarks
                .filter((b) => b.event)
                .map((b) => (
                  <EventCard key={b.id} event={b.event!} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          {subLoading ? (
            <LoadingSpinner label="불러오는 중..." />
          ) : subscriptions.length === 0 ? (
            <EmptyState
              icon={<Settings2 className="h-6 w-6" />}
              title="아직 구독이 없어요"
              description="키워드/소스/지역을 조합해 맞춤 알림을 받아보세요."
              action={
                <Button asChild>
                  <Link href="/my/subscriptions">구독 만들기</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {subscriptions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{s.name}</h3>
                        <Badge variant={s.is_active ? 'default' : 'secondary'}>
                          {s.is_active ? '활성' : '일시정지'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        키워드: <span className="text-foreground">{s.keywords.join(', ')}</span>
                      </p>
                      {s.sources && s.sources.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          소스: {s.sources.map((src) => SOURCE_LABELS[src]).join(', ')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">소스: 전체</p>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link href="/my/subscriptions">관리 <ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <div className="pt-2">
                <Button asChild className="gap-2">
                  <Link href="/my/subscriptions">전체 구독 관리 <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          {meLoading ? (
            <LoadingSpinner label="불러오는 중..." />
          ) : (
            <NotificationSettings
              digestFrequency={digest}
              onChangeFrequency={handleChangeFrequency}
              channelEmail={displayEmail}
              saving={savingDigest}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href?: string;
  accent: 'primary' | 'accent' | 'muted';
}) {
  const inner = (
    <Card className="transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span
          className={[
            'flex h-7 w-7 items-center justify-center rounded-md',
            accent === 'primary' ? 'bg-primary/10 text-primary' : '',
            accent === 'accent' ? 'bg-cat-mlops/15 text-cat-mlops' : '',
            accent === 'muted' ? 'bg-muted text-foreground/70' : '',
          ].join(' ')}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
