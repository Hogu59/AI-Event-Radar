import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

export function LoadingSpinner({ className, size = 20, label }: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2 text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="animate-spin" style={{ width: size, height: size }} />
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">로딩 중</span>
    </div>
  );
}

export function EventListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-auto space-y-2 pt-4">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
