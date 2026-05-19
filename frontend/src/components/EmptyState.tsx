import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon ?? <Sparkles className="h-6 w-6" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
