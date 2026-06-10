import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Styled native <select>. Native keeps keyboard/mobile behaviour for free and stays
 * accessible; the chevron is decorative. All colors/radii come from theme tokens.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative flex w-full">
    <select
      ref={ref}
      className={cn(
        'h-9 w-full appearance-none rounded-md border border-border bg-surface pl-3 pr-8 text-sm text-ink transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      aria-hidden
    />
  </div>
));
Select.displayName = 'Select';
