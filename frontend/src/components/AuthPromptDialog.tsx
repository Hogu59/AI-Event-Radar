'use client';

import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bookmark, Mail, Sparkles } from 'lucide-react';

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'bookmark' | 'subscribe' | 'generic';
}

const COPY: Record<NonNullable<AuthPromptDialogProps['reason']>, { title: string; desc: string; icon: React.ReactNode }> = {
  bookmark: {
    title: '북마크는 가입 후 사용할 수 있어요',
    desc: '관심 행사를 저장하고 D-3 마감 알림을 받으려면 1분 이메일 가입이 필요해요.',
    icon: <Bookmark className="h-5 w-5" />,
  },
  subscribe: {
    title: '키워드 구독은 가입 후 사용할 수 있어요',
    desc: '맞춤 키워드로 새 행사를 이메일로 받으려면 가입이 필요해요.',
    icon: <Mail className="h-5 w-5" />,
  },
  generic: {
    title: '잠깐, 가입이 필요해요',
    desc: '이 기능을 사용하려면 이메일 가입이 필요해요.',
    icon: <Sparkles className="h-5 w-5" />,
  },
};

export function AuthPromptDialog({ open, onOpenChange, reason = 'generic' }: AuthPromptDialogProps) {
  const { title, desc, icon } = COPY[reason];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>나중에 할게요</Button>
          <Button asChild>
            <Link href="/login">이메일로 1분 가입</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
