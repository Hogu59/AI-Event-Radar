import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="container flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-6 py-12 text-center">
      <Logo size={80} className="text-primary opacity-60" />
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">404</p>
        <h1 className="text-3xl font-bold tracking-tight">페이지를 찾을 수 없어요</h1>
        <p className="text-sm text-muted-foreground">
          요청하신 행사 또는 페이지가 더 이상 존재하지 않거나, 이동했어요.
        </p>
      </div>
      <Button asChild>
        <Link href="/">전체 행사로 돌아가기</Link>
      </Button>
    </div>
  );
}
