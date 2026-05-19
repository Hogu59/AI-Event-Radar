'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings2, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { SubscriptionForm, type SubscriptionFormValue } from '@/components/SubscriptionForm';
import { isMockMode } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { LOCATION_TYPE_LABELS, SOURCE_LABELS, type Subscription } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { subscriptions, loading, create, update, remove } = useSubscriptions();
  const [editing, setEditing] = React.useState<Subscription | null>(null);
  const [creating, setCreating] = React.useState(false);

  if (!user && !isMockMode()) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="로그인이 필요해요"
          description="키워드 구독을 만들고 알림을 받으려면 이메일 1분 가입이 필요해요."
          action={
            <Button asChild>
              <Link href="/login?redirect_to=/my/subscriptions">로그인</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const onCreate = async (value: SubscriptionFormValue) => {
    try {
      await create(value);
      setCreating(false);
      toast({ title: '구독을 만들었어요.', description: '매칭되는 새 행사가 등록되면 알림을 보내드릴게요.' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : '구독 생성 실패', variant: 'destructive' });
    }
  };

  const onUpdate = async (sub: Subscription, value: SubscriptionFormValue) => {
    try {
      await update(sub.id, value);
      setEditing(null);
      toast({ title: '구독을 업데이트했어요.' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : '구독 업데이트 실패', variant: 'destructive' });
    }
  };

  const onToggle = async (sub: Subscription) => {
    try {
      await update(sub.id, { is_active: !sub.is_active });
      toast({ title: sub.is_active ? '구독을 일시정지했어요.' : '구독을 다시 활성화했어요.' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : '변경 실패', variant: 'destructive' });
    }
  };

  const onDelete = async (sub: Subscription) => {
    if (!window.confirm(`"${sub.name}" 구독을 삭제할까요?`)) return;
    try {
      await remove(sub.id);
      toast({ title: '구독을 삭제했어요.' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : '삭제 실패', variant: 'destructive' });
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Link href="/my"><ArrowLeft className="h-4 w-4" /> 마이페이지</Link>
        </Button>
      </div>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">구독 관리</h1>
          <p className="text-sm text-muted-foreground">
            키워드 + 소스 + 지역 조합으로 맞춤 알림을 만들 수 있어요.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> 새 구독
        </Button>
      </header>

      {loading ? (
        <LoadingSpinner label="불러오는 중..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={<Settings2 className="h-6 w-6" />}
          title="첫 구독을 만들어보세요"
          description='예) "RAG", "Agent", "LangChain" 키워드 + 서울 오프라인'
          action={
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" /> 구독 만들기
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <SubscriptionRow
              key={sub.id}
              sub={sub}
              onEdit={() => setEditing(sub)}
              onToggle={() => void onToggle(sub)}
              onDelete={() => void onDelete(sub)}
            />
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 구독</DialogTitle>
          </DialogHeader>
          <SubscriptionForm onSubmit={onCreate} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>구독 수정</DialogTitle>
          </DialogHeader>
          {editing ? (
            <SubscriptionForm
              initial={editing}
              submitLabel="변경 사항 저장"
              onSubmit={(v) => onUpdate(editing, v)}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionRow({
  sub,
  onEdit,
  onToggle,
  onDelete,
}: {
  sub: Subscription;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{sub.name}</h3>
            <Badge variant={sub.is_active ? 'default' : 'secondary'}>
              {sub.is_active ? '활성' : '일시정지'}
            </Badge>
            {sub.notify_on_new ? <Badge variant="outline">새 행사</Badge> : null}
            {sub.notify_on_deadline ? <Badge variant="outline">D-3 마감</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {sub.keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {kw}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            소스: {sub.sources?.length ? sub.sources.map((s) => SOURCE_LABELS[s]).join(', ') : '전체'} ·
            {' '}장소: {sub.location_types?.length ? sub.location_types.map((lt) => LOCATION_TYPE_LABELS[lt]).join(', ') : '전체'} ·
            {' '}도시: {sub.cities?.length ? sub.cities.join(', ') : '전체'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">활성</span>
            <Switch checked={sub.is_active} onCheckedChange={onToggle} aria-label="구독 활성화" />
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>수정</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> 삭제
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
