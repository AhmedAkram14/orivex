import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ActionBarProps {
  /** The secondary action at the inline start (e.g. Back); omit on a first step. */
  start?: ReactNode;
  /** The primary action at the inline end. */
  end: ReactNode;
  /** A short line under the actions (e.g. a privacy note). */
  footnote?: ReactNode;
  className?: string;
}

/**
 * A multi-step flow's one action bar: Back at the inline start, the primary action at the inline end, pinned to the
 * bottom of the screen so the next step is always one tap away (on every step, at every size).
 *
 * Opaque (the page's own canvas colour), with a hairline on top. It used to name a colour token that doesn't
 * exist (`surface-subtle`), so it was transparent under a blur, and the form scrolling underneath showed through
 * as smudged, ghosted text (worst in dark mode). It sits after the last field, so scrolled to the bottom
 * that field is clear of it; `data-action-bar` gives the page a matching bottom scroll padding (globals.css),
 * so a field brought into view by focus or an error stops above the bar, not under it.
 */
export function ActionBar({ start, end, footnote, className }: ActionBarProps) {
  return (
    <div
      data-action-bar=""
      className={cn(
        'sticky bottom-0 z-(--z-sticky) -mx-4 mt-2 flex flex-col gap-2 border-t border-border-default bg-canvas px-4 py-3',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-0 sm:rounded-b-(--r-card) sm:px-0',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>{start}</div>
        <div className="flex items-center gap-2">{end}</div>
      </div>
      {footnote}
    </div>
  );
}
