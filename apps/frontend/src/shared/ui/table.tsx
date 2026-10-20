'use client';

import { forwardRef, useEffect, useRef, useState, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Semantic table primitives. Sorting/filtering state is deliberately NOT
 * built in here — that's feature-level composition (or a future dedicated
 * headless table library, e.g. TanStack Table, which would be a new
 * dependency requiring its own discussion, same as Radix was). This layer
 * only guarantees the accessible markup and dense-clinical-data styling;
 * Phase 27's virtualization requirement composes on top of `TableBody`
 * without needing to change this file.
 */

/**
 * Which inline edges of a sideways-scrolling region still have content past them. Logical, so it reads the same
 * in RTL (where Chromium reports scrollLeft as 0 at the start and negative towards the end).
 */
function useInlineOverflow() {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const max = element.scrollWidth - element.clientWidth;
      const position = Math.abs(element.scrollLeft);
      const start = max > 1 && position > 1;
      const end = max > 1 && position < max - 1;
      setEdges((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);

  return { ref, edges };
}

/**
 * A table too wide for its card scrolls sideways inside it, and says so: the edge with more columns past it fades
 * out (a mask, so it works on any background; overlay scrollbars stay hidden until scrolled, so on a phone clipped
 * columns otherwise just looked cut off), and the region takes keyboard focus so it can be scrolled without a pointer.
 */
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const { ref: scrollRef, edges } = useInlineOverflow();
    const scrollable = edges.start || edges.end;
    // The gradient runs from the inline start; `to left` in RTL so "start" is the right-hand edge there.
    const fade = `linear-gradient(to var(--table-fade-direction, right), ${edges.start ? 'transparent' : 'black'}, black 32px, black calc(100% - 32px), ${edges.end ? 'transparent' : 'black'})`;
    return (
      <div
        ref={scrollRef}
        className="relative w-full overflow-x-auto [--table-fade-direction:right] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rtl:[--table-fade-direction:left]"
        style={scrollable ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
        {...(scrollable ? { tabIndex: 0 } : {})}
      >
        <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
      </div>
    );
  },
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('border-b border-border-default', className)} {...props} />
  ),
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  ),
);
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn('border-t border-border-default font-medium', className)} {...props} />
  ),
);
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('min-h-(--row-h) border-b border-border-default transition-colors hover:bg-surface-2', className)}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('h-10 bg-surface-2 px-3 text-start align-middle text-caption text-text-tertiary first:rounded-s-md last:rounded-e-md', className)}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-3 py-2 align-middle text-text-primary', className)} {...props} />
  ),
);
TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-text-tertiary', className)} {...props} />
  ),
);
TableCaption.displayName = 'TableCaption';
