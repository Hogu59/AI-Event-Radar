import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 28 }: LogoProps) {
  return (
    <span
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="9" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="4" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" />
        <path d="M16 16 L16 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="origin-center animate-radar-sweep" />
        <circle cx="22.5" cy="9.5" r="2.2" fill="currentColor" />
      </svg>
    </span>
  );
}
