import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={22} className="text-primary" />
            <span className="text-sm font-semibold">AIEventRadar</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            AI 행사 한 곳에서, 놓치지 않게. 5개 소스 자동 수집 · 중복 제거 · 개인화 알림.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">탐색</span>
            <Link href="/" className="text-foreground/80 hover:text-foreground">전체 행사</Link>
            <Link href="/?categories=Hackathon" className="text-foreground/80 hover:text-foreground">해커톤</Link>
            <Link href="/?categories=LLM" className="text-foreground/80 hover:text-foreground">LLM</Link>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">내 계정</span>
            <Link href="/my/bookmarks" className="text-foreground/80 hover:text-foreground">북마크</Link>
            <Link href="/my/subscriptions" className="text-foreground/80 hover:text-foreground">구독 관리</Link>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">정보</span>
            <a href="https://github.com/brave-people/Dev-Event" target="_blank" rel="noreferrer noopener" className="text-foreground/80 hover:text-foreground">Dev-Event</a>
            <a href="https://luma.com/ai" target="_blank" rel="noreferrer noopener" className="text-foreground/80 hover:text-foreground">Luma AI</a>
            <a href="https://devpost.com/hackathons" target="_blank" rel="noreferrer noopener" className="text-foreground/80 hover:text-foreground">Devpost</a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AIEventRadar. All rights reserved.</span>
          <span>5개 소스 통합 · KST 기준 표시</span>
        </div>
      </div>
    </footer>
  );
}
