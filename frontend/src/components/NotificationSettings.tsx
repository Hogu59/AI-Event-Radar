'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIGEST_FREQUENCY_LABELS, type DigestFrequency } from '@/lib/types';

interface NotificationSettingsProps {
  digestFrequency: DigestFrequency;
  onChangeFrequency: (next: DigestFrequency) => void | Promise<void>;
  channelEmail?: string | null;
  saving?: boolean;
}

const FREQ_OPTIONS: { value: DigestFrequency; label: string; desc: string }[] = [
  { value: 'realtime', label: '실시간', desc: '수집 직후 매칭되는 행사가 있으면 즉시' },
  { value: 'daily', label: '매일', desc: '매일 오전 9시 KST 다이제스트' },
  { value: 'weekly', label: '주간', desc: '매주 월요일 오전 9시 KST' },
  { value: 'off', label: '받지 않기', desc: '북마크/마감 알림만 받기' },
];

export function NotificationSettings({ digestFrequency, onChangeFrequency, channelEmail, saving = false }: NotificationSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>알림 설정</CardTitle>
        <CardDescription>다이제스트 빈도와 채널을 설정합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">다이제스트 빈도</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FREQ_OPTIONS.map((opt) => {
              const active = digestFrequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => void onChangeFrequency(opt.value)}
                  aria-pressed={active}
                  disabled={saving}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                      : 'border-border hover:bg-accent',
                    saving && 'opacity-60 pointer-events-none',
                  )}
                >
                  <span className="flex w-full items-center justify-between text-sm font-semibold">
                    <span>{opt.label}</span>
                    {active ? <Check className="h-4 w-4 text-primary" /> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {saving ? '저장 중...' : `현재 선택: ${DIGEST_FREQUENCY_LABELS[digestFrequency]}`}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">채널</Label>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">이메일</p>
                <p className="text-xs text-muted-foreground">{channelEmail ?? '가입한 이메일로 발송'}</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              활성
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Slack/Discord/Telegram 채널은 Phase 2에서 추가될 예정이에요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
