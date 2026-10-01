import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface LandingSectionProps extends HTMLAttributes<HTMLElement> {
  /**
   * `canvas` (default): half of `--section-y` on each block edge, so two neighbouring sections add up to one
   * full step. `band`: a full-bleed coloured band, padded inside by the full `--section-y` on both edges.
   */
  variant?: 'canvas' | 'band';
  /**
   * The full `--section-y` on that edge of a canvas section, where no neighbour supplies the other half: the
   * first section after the hero (top), the last before the footer (bottom), and the edge that faces a band.
   */
  fullTop?: boolean;
  fullBottom?: boolean;
}

/**
 * One landing-page section: owns the page's vertical rhythm, so a section's own content carries no outer
 * margin or padding of its own (its first and last children sit on these edges). Horizontal layout is the
 * `Container` inside it. Decorations go absolutely positioned, out of the flow.
 */
export function LandingSection({
  variant = 'canvas',
  fullTop,
  fullBottom,
  className,
  ...props
}: LandingSectionProps) {
  const full = variant === 'band';
  return (
    <section
      data-landing-section={variant}
      className={cn(
        full || fullTop ? 'pt-(--section-y)' : 'pt-[calc(var(--section-y)/2)]',
        full || fullBottom ? 'pb-(--section-y)' : 'pb-[calc(var(--section-y)/2)]',
        className,
      )}
      {...props}
    />
  );
}
