'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  SOURCE_IDS,
  SOURCE_LABELS,
  type EventFiltersState,
  type LocationType,
  type SourceId,
} from '@/lib/types';
import { filtersFromSearchParams, filtersToQueryString, isEmptyFilters } from '@/lib/filters';
import { Filter, Search, X } from 'lucide-react';

const POPULAR_CITIES = ['서울', '판교', '성남', '대전', 'Online', 'San Francisco', 'New York'];
const POPULAR_CATEGORIES = ['LLM', 'Agent', 'RAG', 'MLOps', 'Hackathon', 'Meetup', 'Vision'];
const SORT_OPTIONS = [
  { value: 'start_at_asc', label: '가까운 날짜순' },
  { value: 'start_at_desc', label: '먼 날짜순' },
  { value: 'collected_at_desc', label: '최근 등록순' },
] as const;

interface EventFiltersProps {
  className?: string;
}

export function EventFilters({ className }: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = React.useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const [draft, setDraft] = React.useState<EventFiltersState>(current);

  // Sync from URL whenever it changes externally
  React.useEffect(() => {
    setDraft(current);
  }, [current]);

  const apply = React.useCallback((next: EventFiltersState) => {
    const qs = filtersToQueryString({ ...next, page: 1 });
    router.push(`/${qs}`);
  }, [router]);

  const updateAndApply = (patch: Partial<EventFiltersState>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    apply(next);
  };

  const toggleInArray = <T extends string>(arr: T[] | undefined, value: T): T[] | undefined => {
    const set = new Set(arr ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const arrOut = Array.from(set);
    return arrOut.length > 0 ? arrOut : undefined;
  };

  const reset = () => {
    setDraft({});
    router.push('/');
  };

  return (
    <aside className={cn('flex flex-col gap-6', className)} aria-label="행사 필터">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-primary" /> 필터
        </h2>
        {!isEmptyFilters(current) ? (
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1 text-xs">
            <X className="h-3 w-3" /> 초기화
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-q" className="text-xs uppercase tracking-wide text-muted-foreground">
          키워드 검색
        </Label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(draft);
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="filter-q"
              type="search"
              placeholder="RAG, Agent, LangChain..."
              value={draft.q ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              className="pl-9"
            />
          </div>
        </form>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">정렬</Label>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const active = (draft.sort ?? 'start_at_asc') === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateAndApply({ sort: opt.value })}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-accent',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <FilterGroup label="소스">
        <div className="grid grid-cols-2 gap-1.5">
          {SOURCE_IDS.map((s) => (
            <FilterChip
              key={s}
              active={draft.sources?.includes(s) ?? false}
              onClick={() => updateAndApply({ sources: toggleInArray<SourceId>(draft.sources, s) })}
            >
              {SOURCE_LABELS[s]}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="카테고리">
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={draft.categories?.some((x) => x.toLowerCase() === c.toLowerCase()) ?? false}
              onClick={() => updateAndApply({ categories: toggleInArray(draft.categories, c) })}
            >
              {c}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="장소 유형">
        <div className="flex flex-wrap gap-1.5">
          {LOCATION_TYPES.map((lt) => (
            <FilterChip
              key={lt}
              active={draft.location_types?.includes(lt) ?? false}
              onClick={() => updateAndApply({ location_types: toggleInArray<LocationType>(draft.location_types, lt) })}
            >
              {LOCATION_TYPE_LABELS[lt]}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="도시">
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CITIES.map((city) => (
            <FilterChip
              key={city}
              active={draft.cities?.some((c) => c.toLowerCase() === city.toLowerCase()) ?? false}
              onClick={() => updateAndApply({ cities: toggleInArray(draft.cities, city) })}
            >
              {city}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>

      <Separator />

      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
        <div className="space-y-0.5">
          <Label htmlFor="ai-only" className="cursor-pointer text-sm font-medium">
            AI 행사만 보기
          </Label>
          <p className="text-xs text-muted-foreground">키워드 필터에 매칭된 결과만 표시</p>
        </div>
        <Switch
          id="ai-only"
          checked={draft.is_ai_related !== false}
          onCheckedChange={(checked) => updateAndApply({ is_ai_related: checked ? true : false })}
        />
      </div>
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
