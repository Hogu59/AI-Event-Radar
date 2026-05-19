'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { SOURCE_IDS, SOURCE_LABELS, type RunStatus, type SourceId, type SourceRunLog } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface RunData {
  runs: SourceRunLog[];
  stats_24h: { total_runs: number; successful: number; failed: number; total_new_events: number };
}

export default function AdminPage() {
  const [data, setData] = React.useState<RunData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [retryPending, setRetryPending] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.listSourceRuns();
      setData(r);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError({ code: 'INTERNAL_ERROR', message: '로드 실패', status: 500 }));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onRetry = async (source: SourceId) => {
    setRetryPending(source);
    try {
      await api.retrySource(source);
      toast({ title: `${SOURCE_LABELS[source]} 재실행을 트리거했어요.` });
      await load();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : '재실행 실패', variant: 'destructive' });
    } finally {
      setRetryPending(null);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Link href="/"><ArrowLeft className="h-4 w-4" /> 둘러보기로</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> 새로고침
        </Button>
      </div>

      <header className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">관리자 대시보드</h1>
        <p className="text-sm text-muted-foreground">소스별 수집 로그와 24시간 통계.</p>
      </header>

      {loading ? (
        <LoadingSpinner label="로드 중..." />
      ) : error ? (
        <EmptyState
          icon={<AlertOctagon className="h-6 w-6" />}
          title="로드에 실패했어요"
          description={error.message}
          action={<Button onClick={load} size="sm">다시 시도</Button>}
        />
      ) : data ? (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="총 실행" value={data.stats_24h.total_runs} icon={<Activity className="h-4 w-4" />} tone="muted" />
            <StatBox label="성공" value={data.stats_24h.successful} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
            <StatBox label="실패" value={data.stats_24h.failed} icon={<AlertOctagon className="h-4 w-4" />} tone="danger" />
            <StatBox label="신규 행사" value={data.stats_24h.total_new_events} icon={<Activity className="h-4 w-4" />} tone="primary" />
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {SOURCE_IDS.map((s) => (
              <Card key={s}>
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{SOURCE_LABELS[s]}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">소스별 액션</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => void onRetry(s)}
                    disabled={retryPending === s}
                  >
                    <RefreshCw className={cn('h-4 w-4', retryPending === s && 'animate-spin')} />
                    재실행
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">최근 수집 로그</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">소스</th>
                      <th className="px-4 py-2.5 font-medium">상태</th>
                      <th className="px-4 py-2.5 font-medium tabular-nums">수집</th>
                      <th className="px-4 py-2.5 font-medium tabular-nums">신규</th>
                      <th className="px-4 py-2.5 font-medium tabular-nums">갱신</th>
                      <th className="px-4 py-2.5 font-medium">시작</th>
                      <th className="px-4 py-2.5 font-medium">메시지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.runs.map((run) => (
                      <tr key={run.id} className="hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium">{SOURCE_LABELS[run.source]}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={run.status} /></td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{run.events_collected}</td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold text-primary">{run.events_new}</td>
                        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{run.events_updated}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground" title={formatDateTime(run.started_at)}>
                          {timeAgo(run.started_at)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{run.error_message ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    success: {
      label: '성공',
      cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    partial: {
      label: '부분 성공',
      cls: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    failed: {
      label: '실패',
      cls: 'border-destructive/30 bg-destructive/10 text-destructive',
      icon: <AlertOctagon className="h-3 w-3" />,
    },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', cls)}>
      {icon}
      {label}
    </span>
  );
}

function StatBox({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'muted' | 'success' | 'danger' | 'primary';
}) {
  const tones = {
    muted: 'bg-muted text-foreground/80',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    danger: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  } as const;
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-md', tones[tone])}>{icon}</span>
      </CardContent>
    </Card>
  );
}
