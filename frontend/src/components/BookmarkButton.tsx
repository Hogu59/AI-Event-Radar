'use client';

import * as React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { AuthPromptDialog } from '@/components/AuthPromptDialog';
import { toast } from '@/hooks/useToast';
import { ApiError, isMockMode } from '@/lib/api';

interface BookmarkButtonProps {
  eventId: string;
  className?: string;
  variant?: 'icon' | 'pill';
  size?: 'sm' | 'md';
  /** Optional initial state from server (e.g. event.is_bookmarked) */
  initialBookmarked?: boolean;
}

export function BookmarkButton({
  eventId,
  className,
  variant = 'icon',
  size = 'md',
  initialBookmarked,
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const { bookmarkByEventId, toggle, loading } = useBookmarks();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  // Mock mode treats anonymous as "logged in" so the demo is usable.
  const isAuthed = Boolean(user) || isMockMode();
  const bookmarked =
    eventId in bookmarkByEventId || (loading && initialBookmarked === true);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      setAuthOpen(true);
      return;
    }
    setPending(true);
    try {
      const { added } = await toggle(eventId);
      toast({
        title: added ? '북마크에 저장했어요' : '북마크에서 제거했어요',
        description: added ? '마이페이지 > 북마크에서 확인할 수 있어요.' : undefined,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '북마크 처리에 실패했어요.';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  const Icon = bookmarked ? BookmarkCheck : Bookmark;
  const label = bookmarked ? '북마크 해제' : '북마크';

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={bookmarked}
          disabled={pending}
          className={cn(
            'inline-flex items-center justify-center rounded-full border border-border bg-background/90 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            bookmarked && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15',
            size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
            pending && 'opacity-60',
            className,
          )}
        >
          <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
        </button>
        <AuthPromptDialog open={authOpen} onOpenChange={setAuthOpen} reason="bookmark" />
      </>
    );
  }

  return (
    <>
      <Button
        variant={bookmarked ? 'default' : 'outline'}
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={onClick}
        disabled={pending}
        className={cn('gap-2', className)}
      >
        <Icon className="h-4 w-4" />
        {bookmarked ? '북마크됨' : '북마크'}
      </Button>
      <AuthPromptDialog open={authOpen} onOpenChange={setAuthOpen} reason="bookmark" />
    </>
  );
}
