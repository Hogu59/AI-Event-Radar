'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  SOURCE_IDS,
  SOURCE_LABELS,
  type LocationType,
  type SourceId,
  type Subscription,
} from '@/lib/types';

export interface SubscriptionFormValue {
  name: string;
  keywords: string[];
  sources: SourceId[] | null;
  location_types: LocationType[] | null;
  cities: string[] | null;
  notify_on_new: boolean;
  notify_on_deadline: boolean;
}

interface SubscriptionFormProps {
  initial?: Partial<Subscription>;
  onSubmit: (value: SubscriptionFormValue) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const POPULAR_CITIES = ['서울', '판교', '성남', '대전', 'Online', 'San Francisco', 'New York'];

export function SubscriptionForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = '구독 만들기',
}: SubscriptionFormProps) {
  const [name, setName] = React.useState(initial?.name ?? '');
  const [keywords, setKeywords] = React.useState<string[]>(initial?.keywords ?? []);
  const [keywordInput, setKeywordInput] = React.useState('');
  const [sources, setSources] = React.useState<SourceId[] | null>(initial?.sources ?? null);
  const [locationTypes, setLocationTypes] = React.useState<LocationType[] | null>(initial?.location_types ?? null);
  const [cities, setCities] = React.useState<string[] | null>(initial?.cities ?? null);
  const [cityInput, setCityInput] = React.useState('');
  const [notifyOnNew, setNotifyOnNew] = React.useState(initial?.notify_on_new ?? true);
  const [notifyOnDeadline, setNotifyOnDeadline] = React.useState(initial?.notify_on_deadline ?? true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addKeyword = (raw: string) => {
    const cleaned = raw.trim().replace(/^[,]+|[,]+$/g, '');
    if (!cleaned) return;
    if (keywords.some((k) => k.toLowerCase() === cleaned.toLowerCase())) return;
    setKeywords((prev) => [...prev, cleaned]);
  };

  const onKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(keywordInput);
      setKeywordInput('');
    } else if (e.key === 'Backspace' && keywordInput === '' && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1));
    }
  };

  const toggleSource = (s: SourceId) => {
    const current = sources ?? [];
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    setSources(next.length === SOURCE_IDS.length || next.length === 0 ? null : next);
  };

  const toggleLocationType = (lt: LocationType) => {
    const current = locationTypes ?? [];
    const next = current.includes(lt) ? current.filter((x) => x !== lt) : [...current, lt];
    setLocationTypes(next.length === LOCATION_TYPES.length || next.length === 0 ? null : next);
  };

  const toggleCity = (city: string) => {
    const current = cities ?? [];
    const next = current.includes(city) ? current.filter((x) => x !== city) : [...current, city];
    setCities(next.length === 0 ? null : next);
  };

  const addCity = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const current = cities ?? [];
    if (current.some((c) => c.toLowerCase() === cleaned.toLowerCase())) return;
    setCities([...current, cleaned]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('구독 이름을 입력해주세요.');
      return;
    }
    const finalKeywords = [...keywords];
    if (keywordInput.trim()) finalKeywords.push(keywordInput.trim());
    if (finalKeywords.length === 0) {
      setError('키워드를 한 개 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        keywords: finalKeywords,
        sources,
        location_types: locationTypes,
        cities,
        notify_on_new: notifyOnNew,
        notify_on_deadline: notifyOnDeadline,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="sub-name">구독 이름</Label>
        <Input
          id="sub-name"
          placeholder="예: RAG/Agent 알림"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub-keywords">키워드 (필수)</Label>
        <p className="text-xs text-muted-foreground">엔터 또는 쉼표로 키워드 추가</p>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {kw}
              <button
                type="button"
                onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                aria-label={`${kw} 삭제`}
                className="rounded-full hover:bg-primary/15"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="sub-keywords"
            type="text"
            placeholder={keywords.length === 0 ? 'LLM, RAG, Agent, LangChain...' : ''}
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={onKeywordKeyDown}
            className="flex-1 min-w-[140px] border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>소스 (선택)</Label>
        <p className="text-xs text-muted-foreground">선택하지 않으면 전체 소스 대상</p>
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_IDS.map((s) => {
            const active = sources?.includes(s) ?? false;
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSource(s)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-accent',
                )}
              >
                {SOURCE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>장소 유형 (선택)</Label>
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_TYPES.map((lt) => {
            const active = locationTypes?.includes(lt) ?? false;
            return (
              <button
                key={lt}
                type="button"
                onClick={() => toggleLocationType(lt)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-accent',
                )}
              >
                {LOCATION_TYPE_LABELS[lt]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sub-cities">도시 (선택)</Label>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CITIES.map((city) => {
            const active = cities?.some((c) => c.toLowerCase() === city.toLowerCase()) ?? false;
            return (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-accent',
                )}
              >
                {city}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            id="sub-cities"
            placeholder="다른 도시 추가..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCity(cityInput);
                setCityInput('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              addCity(cityInput);
              setCityInput('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {cities && cities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {cities.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
              >
                {c}
                <button
                  type="button"
                  onClick={() => toggleCity(c)}
                  aria-label={`${c} 삭제`}
                  className="rounded-full hover:bg-secondary-foreground/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="notify-new" className="cursor-pointer">새 행사 알림</Label>
            <p className="text-xs text-muted-foreground">매칭되는 신규 행사가 등록되면 알림</p>
          </div>
          <Switch id="notify-new" checked={notifyOnNew} onCheckedChange={setNotifyOnNew} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="notify-deadline" className="cursor-pointer">마감 D-3 알림</Label>
            <p className="text-xs text-muted-foreground">행사 시작 72시간 전 리마인드</p>
          </div>
          <Switch
            id="notify-deadline"
            checked={notifyOnDeadline}
            onCheckedChange={setNotifyOnDeadline}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {submitting ? '저장 중...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
