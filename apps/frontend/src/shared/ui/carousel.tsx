import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * A minimal horizontal-scroll-snap carousel -- native CSS scroll-snap, no
 * carousel library dependency. Exactly one `CarouselItem` sits in view at a
 * time (each is `w-full shrink-0`); the user swipes/scrolls horizontally to
 * reach the next one, rather than a cramped multi-column grid squeezing
 * several cards into a narrow viewport.
 */
export function Carousel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="list"
      className={cn('flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CarouselItem({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="listitem" className={cn('w-full shrink-0 snap-center', className)} {...props}>
      {children}
    </div>
  );
}
