import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const heroVariants = cva('relative overflow-hidden rounded-(--r-hero) border border-border-default p-(--card-pad) sm:p-8', {
  variants: {
    variant: {
      // Patient surfaces: soft peach -> blush warmth fading into the canvas.
      patient: 'bg-linear-to-br from-warm-1 via-warm-2/40 to-canvas',
      // Doctor surfaces: lime clinical focus (pulse 18%) at compact density.
      doctor: 'bg-linear-to-br from-pulse/18 to-canvas',
    },
  },
  defaultVariants: { variant: 'patient' },
});

export interface HeroSurfaceProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof heroVariants> {}

/**
 * The page's ONE hero surface (radius 28). At most one per page -- it exists
 * to give the single most important thing on a screen (the patient's next
 * step, the doctor's day) a distinct ground. Never nest cards with their own
 * hero treatment inside it, and never use it as a generic panel.
 */
export function HeroSurface({ className, variant, ...props }: HeroSurfaceProps) {
  return <div className={cn(heroVariants({ variant }), className)} {...props} />;
}
