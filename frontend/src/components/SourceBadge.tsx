import { cn } from '@/lib/utils';
import { SOURCE_BADGE_CLASS, SOURCE_LABELS, type SourceId } from '@/lib/types';
import { Github, Globe2, Sparkles, Ticket, Trophy } from 'lucide-react';

const SOURCE_ICONS: Record<SourceId, typeof Globe2> = {
  festa: Ticket,
  eventus: Sparkles,
  luma: Globe2,
  dev_event: Github,
  devpost: Trophy,
};

interface SourceBadgeProps {
  source: SourceId;
  className?: string;
  withIcon?: boolean;
}

export function SourceBadge({ source, className, withIcon = true }: SourceBadgeProps) {
  const Icon = SOURCE_ICONS[source];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        SOURCE_BADGE_CLASS[source],
        className,
      )}
    >
      {withIcon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {SOURCE_LABELS[source]}
    </span>
  );
}
