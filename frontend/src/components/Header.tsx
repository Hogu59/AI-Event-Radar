'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Bookmark, LogIn, Menu, Search, Settings2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut, loading } = useAuth();
  const [q, setQ] = React.useState(searchParams.get('q') ?? '');

  React.useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set('q', q.trim());
    else params.delete('q');
    params.delete('page');
    router.push(`/${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-foreground">
          <Logo size={26} className="text-primary" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            AIEventRadar
          </span>
        </Link>

        <form onSubmit={onSearch} className="hidden flex-1 max-w-xl md:flex" role="search">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="행사 제목, 키워드, 호스트로 검색..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              aria-label="행사 검색"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/my/bookmarks"
            className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          >
            <Bookmark className="h-4 w-4" /> 북마크
          </Link>
          <Link
            href="/my/subscriptions"
            className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex"
          >
            <Settings2 className="h-4 w-4" /> 구독
          </Link>
          <ThemeToggle />
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" aria-hidden />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email?.split('@')[0] ?? '내 계정'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my">마이페이지</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my/bookmarks">북마크</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my/subscriptions">구독 관리</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>로그아웃</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="gap-2">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                로그인
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="메뉴"
            onClick={() => router.push('/my')}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </nav>
      </div>

      <form onSubmit={onSearch} className="border-t border-border md:hidden" role="search">
        <div className="container relative py-2">
          <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="행사 검색..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            aria-label="행사 검색"
          />
        </div>
      </form>
    </header>
  );
}
