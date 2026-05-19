'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { EventCard } from '@/components/EventCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { isMockMode } from '@/lib/api';
import { toast } from '@/hooks/useToast';

export default function BookmarksPage() {
  const { user } = useAuth();
  const { bookmarks, loading, remove } = useBookmarks();
  const [bulkPending, setBulkPending] = React.useState(false);

  if (!user && !isMockMode()) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="로그인이 필요해요"
          description="북마크를 사용하려면 이메일로 가입해주세요."
          action={
            <Button asChild>
              <Link href="/login?redirect_to=/my/bookmarks">로그인</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const handleClearAll = async () => {
    if (!bookmarks.length) return;
    if (!window.confirm(`${bookmarks.length}개 북마크를 모두 삭제할까요?`)) return;
    setBulkPending(true);
    try {
      for (const bm of bookmarks) {
        await remove(bm.id);
      }
      toast({ title: '북마크를 모두 비웠어요.' });
    } catch {
      toast({ title: '일부 북마크 삭제에 실패했어요.', variant: 'destructive' });
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Link href="/my"><ArrowLeft className="h-4 w-4" /> 마이페이지</Link>
        </Button>
        {bookmarks.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={bulkPending} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> 모두 비우기
          </Button>
        ) : null}
      </div>

      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">북마크 ({bookmarks.length})</h1>
        <p className="text-sm text-muted-foreground">관심 행사를 저장해두면 D-3 마감 알림을 받을 수 있어요.</p>
      </header>

      {loading ? (
        <LoadingSpinner label="불러오는 중..." />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="아직 북마크가 없어요"
          description="둘러보기에서 카드 우측 상단의 북마크 버튼을 눌러보세요."
          action={<Button asChild><Link href="/">행사 둘러보기</Link></Button>}
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
    </div>
  );
}
