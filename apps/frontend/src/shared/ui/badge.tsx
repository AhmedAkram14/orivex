import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-neutral-subtle text-text-secondary',
        primary: 'bg-primary-subtle text-primary-emphasis',
        success: 'bg-success-subtle text-success-emphasis',
        warning: 'bg-warning-subtle text-warning-emphasis',
        danger: 'bg-danger-subtle text-danger-emphasis',
        info: 'bg-info-subtle text-info-emphasis',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/** A design-system primitive (per Phase 1's own distinction: `<Badge>` is generic; a feature component like a future `<PatientStatusBadge>` that maps a domain status to one of these variants belongs in a feature module, not here). */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
