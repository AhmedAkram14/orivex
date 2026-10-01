import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const heroVariants = cva('relative isolate overflow-hidden rounded-(--r-hero) border border-border-default p-(--card-pad) sm:p-8', {
  variants: {
    variant: {
      // Patient surfaces: soft peach -> blush warmth fading into the canvas.
      patient: 'bg-linear-to-br from-warm-1 via-warm-2/40 to-canvas',
      // Doctor surfaces: plain surface. Its data (the day strip) is drawn in lime, so the ground carries no lime
      // tint -- only a faint glow in the far corner (below), clear of the content.
      doctor: 'bg-surface',
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
export function HeroSurface({ className, variant, children, ...props }: HeroSurfaceProps) {
  return (
    <div className={cn(heroVariants({ variant }), className)} {...props}>
      {variant === 'doctor' && (
        // At most 8% pulse, confined to the inline-end top corner -- never under the timeline.
        <div
          aria-hidden="true"
          data-hero-glow=""
          className="pointer-events-none absolute -end-24 -top-24 -z-10 size-48 rounded-full bg-pulse/8 blur-3xl"
        />
      )}
      {children}
    </div>
  );
}
