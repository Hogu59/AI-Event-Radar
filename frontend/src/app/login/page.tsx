'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { api, ApiError, isMockMode } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="container py-16" />}>
      <LoginPageInner />
    </React.Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to') ?? '/my';
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await api.requestMagicLink(email, redirectTo);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인 메일 발송에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-12rem)] items-center justify-center py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Logo size={38} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">로그인 또는 가입</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            이메일로 1분이면 시작할 수 있어요. 비밀번호 없이 Magic Link로 로그인합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">이메일 Magic Link</CardTitle>
            <CardDescription>가입한 이메일로 1회용 로그인 링크를 보냅니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-4 w-4" /> 메일을 보냈어요
                </div>
                <p className="text-foreground/85">
                  <span className="font-medium">{email}</span>로 로그인 링크를 보냈어요. 5분 내에 확인해주세요.
                </p>
                {isMockMode() ? (
                  <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    데모 모드: 실제 메일은 발송되지 않아요. <Link href="/my" className="font-medium text-primary underline-offset-2 hover:underline">마이페이지로 이동</Link>해 데모를 둘러볼 수 있어요.
                  </p>
                ) : null}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                {error ? (
                  <p className={cn('flex items-center gap-2 text-sm text-destructive')}>
                    <AlertCircle className="h-4 w-4" /> {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? '발송 중...' : '로그인 링크 받기'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          계속 진행하면{' '}
          <a href="#" className="underline-offset-2 hover:underline">서비스 약관</a>과{' '}
          <a href="#" className="underline-offset-2 hover:underline">개인정보 처리방침</a>에 동의하는 것으로 간주됩니다.
        </p>

        <div className="flex justify-center">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              둘러보기로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
