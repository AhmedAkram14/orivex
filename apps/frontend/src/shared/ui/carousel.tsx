'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

/**
 * A minimal horizontal-scroll-snap carousel -- native CSS scroll-snap, no
 * carousel library dependency. `CarouselItem`s are `shrink-0`, sized by
 * their own `className` (a caller controls how many sit in view at once --
 * full width for one-at-a-time, a fraction for several-at-once); the user
 * swipes/scrolls horizontally, or with `showControls`, clicks the prev/next
 * arrows or a page dot, to reach the next page.
 */
export function Carousel({ className, children, showControls = false, ...props }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);

  // A "page" is one full viewport-width scroll -- however many CarouselItems
  // that happens to fit (1 on mobile, more on wider `showControls` layouts)
  // -- recomputed on scroll and on resize (e.g. a breakpoint change altering
  // how many items fit per page) rather than assumed from the item count.
  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setPageCount(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)));
    setActivePage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    if (!showControls) return;
    const el = scrollRef.current;
    if (!el) return;

    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      resizeObserver.disconnect();
    };
  }, [measure, showControls, children]);

  function scrollToPage(page: number): void {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: page * el.clientWidth, behavior: 'smooth' });
  }

  return (
    // `w-full` here (not just on the inner scroll div, via the caller's own
    // className) is load-bearing: without it, this wrapper has no width of
    // its own, so the inner div's `w-full` resolves against an
    // indeterminate shrink-to-fit box instead of the real Container width --
    // observed as the whole carousel rendering ~140px wider than the
    // viewport and shifted off-center.
    <div className={cn('relative w-full', showControls && 'px-12')}>
      <div
        ref={scrollRef}
        role="list"
        className={cn(
          // The browser's scroll-anchoring heuristic (which auto-adjusts a
          // scrollable element's position to compensate for layout shifts,
          // e.g. late-loading fonts/icons) can silently drag a snap-x
          // container away from scrollLeft 0 on first paint -- disabled here
          // so this carousel always starts exactly where it visually should.
          // The scroll itself is still fully usable by touch/trackpad/the
          // arrow buttons below -- only the native OS scrollbar chrome is
          // hidden (`scrollbar-none` is this Tailwind version's built-in
          // cross-browser utility for it).
          //
          // The arrow-button gutter lives on the OUTER wrapper (above), not
          // here: padding on this scrollable element itself doesn't clip
          // anything -- an item positioned inside the padding zone still
          // paints there, up to this element's own outer edge, which is
          // exactly the "5th card visibly peeking past the arrow" bug this
          // replaced. With the gutter on the outer wrapper instead, this
          // element's own box is the true, fully-clipped viewport, so
          // percentage-based item widths (computed against this box) never
          // have anywhere to visually overflow into.
          'flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scrollbar-none [overflow-anchor:none]',
          className,
        )}
        {...props}
      >
        {children}
      </div>

      {showControls && pageCount > 1 && (
        <>
          {/* Flush with the carousel's own edge (not offset outside it) --
              a negative offset here previously pushed the button past the
              Container's own bounding box and introduced real page-level
              horizontal overflow. */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous"
            disabled={activePage === 0}
            onClick={() => scrollToPage(activePage - 1)}
            className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full border-border-default bg-surface text-primary shadow-md hover:border-primary hover:bg-primary-subtle hover:text-primary-emphasis"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next"
            disabled={activePage === pageCount - 1}
            onClick={() => scrollToPage(activePage + 1)}
            className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full border-border-default bg-surface text-primary shadow-md hover:border-primary hover:bg-primary-subtle hover:text-primary-emphasis"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>

          <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Carousel pages">
            {Array.from({ length: pageCount }).map((_, page) => (
              <button
                key={page}
                type="button"
                role="tab"
                aria-selected={page === activePage}
                aria-label={`Go to page ${page + 1} of ${pageCount}`}
                onClick={() => scrollToPage(page)}
                className={cn(
                  'size-2 rounded-full transition-colors duration-(--duration-fast) ease-standard',
                  page === activePage ? 'bg-primary' : 'bg-border-default hover:bg-border-strong',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders prev/next arrow buttons and page dots, and tracks the active page as the user scrolls. Off by default so a plain one-at-a-time carousel (e.g. mobile) stays exactly as before. */
  showControls?: boolean;
}

export function CarouselItem({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    // `snap-start` (not `snap-center`): with several items per page,
    // `scrollToPage()` lands on an exact clientWidth multiple, but a
    // center-aligned snap point pulls the browser's own settle behavior
    // toward whichever item is nearest-to-centered instead -- landing
    // between pages, with a card sliver visible on both edges.
    // Left-aligning each item's snap point keeps every page boundary clean.
    <div role="listitem" className={cn('w-full shrink-0 snap-start', className)} {...props}>
      {children}
    </div>
  );
}
