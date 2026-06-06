import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11px] font-medium',
  {
    variants: {
      variant: {
        default: 'border border-border bg-surface text-muted',
        accent: 'bg-accent text-accent-foreground',
        primary: 'bg-primary text-primary-foreground',
        outline: 'border border-border text-muted',
        success: 'border border-success/25 bg-success/12 text-success',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
