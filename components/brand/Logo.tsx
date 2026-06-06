import { cn } from '@/lib/utils';

/**
 * VoyageOS brand mark — a compass needle (pointing NE, "voyage forward") in the lime signature
 * on the near-black badge. Single source of truth for the logo; keep in sync with app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-accent',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[58%]" aria-hidden>
        <g transform="rotate(45 12 12)">
          <path d="M12 3.5 L15 12 L9 12 Z" fill="currentColor" />
          <path d="M12 20.5 L15 12 L9 12 Z" fill="currentColor" fillOpacity="0.4" />
        </g>
      </svg>
    </span>
  );
}

/** Brand mark + wordmark, used in the sidebar and auth/empty screens. */
export function Wordmark({ markClassName }: { markClassName?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={markClassName ?? 'size-9'} />
      <span className="font-display text-xl font-semibold leading-none text-ink">
        Voyage<span className="text-muted">OS</span>
      </span>
    </span>
  );
}
