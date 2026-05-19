import Link from 'next/link';
import { Calendar, MapPin, Users, ExternalLink } from 'lucide-react';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDateRange, formatLocation, formatPrice, relativeDateLabel, isPast } from '@/lib/format';
import { SourceBadge } from '@/components/SourceBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { BookmarkButton } from '@/components/BookmarkButton';

interface EventCardProps {
  event: Event;
  className?: string;
}

const TONE_CLASSES: Record<string, string> = {
  today: 'bg-destructive/15 text-destructive border-destructive/30',
  tomorrow: 'bg-cat-hackathon/15 text-cat-hackathon border-cat-hackathon/30',
  soon: 'bg-primary/15 text-primary border-primary/30',
  upcoming: 'bg-muted text-muted-foreground border-border',
  past: 'bg-muted/60 text-muted-foreground/70 border-border',
};

export function EventCard({ event, className }: EventCardProps) {
  const rel = relativeDateLabel(event.start_at);
  const past = isPast(event.end_at ?? event.start_at);

  // Limit visible categories
  const visibleCats = event.categories.slice(0, 3);
  const extraCats = event.categories.length - visibleCats.length;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        past && 'opacity-70',
        className,
      )}
    >
      <Link
        href={`/events/${event.id}`}
        className="flex flex-1 flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`${event.title} - ${formatDateRange(event.start_at, event.end_at)}`}
      >
        <div className="mb-3 flex items-center gap-2">
          <SourceBadge source={event.source} />
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              TONE_CLASSES[rel.tone],
            )}
          >
            {rel.label}
          </span>
          {event.price && (event.price.toLowerCase() === '무료' || event.price.toLowerCase() === 'free') ? (
            <span className="ml-auto inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              FREE
            </span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary">
          {event.title}
        </h3>

        {event.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
        ) : null}

        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-start gap-2 text-foreground/80">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="line-clamp-1">{formatDateRange(event.start_at, event.end_at)}</span>
          </div>
          <div className="flex items-start gap-2 text-foreground/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="line-clamp-1">{formatLocation(event)}</span>
          </div>
          {event.host_name ? (
            <div className="flex items-start gap-2 text-foreground/70">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="line-clamp-1">{event.host_name}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {visibleCats.map((c) => (
            <CategoryBadge key={c} category={c} />
          ))}
          {extraCats > 0 ? (
            <span className="text-xs text-muted-foreground">+{extraCats}</span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted-foreground">
          <span>{formatPrice(event.price)}</span>
          <span className="inline-flex items-center gap-1 text-foreground/70 transition-colors group-hover:text-primary">
            상세 보기
            <ExternalLink className="h-3 w-3" aria-hidden />
          </span>
        </div>
      </Link>

      <div className="absolute right-3 top-3">
        <BookmarkButton eventId={event.id} initialBookmarked={event.is_bookmarked} />
      </div>
    </article>
  );
}
