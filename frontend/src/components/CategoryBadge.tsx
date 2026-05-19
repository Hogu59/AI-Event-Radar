import { cn } from '@/lib/utils';
import { categoryStyleFor } from '@/lib/types';

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const { label, className: tone } = categoryStyleFor(category);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
