import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Column count at each breakpoint; omitted breakpoints inherit the previous one. */
  cols?: Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl', 1 | 2 | 3 | 4 | 6 | 12>>;
  gap?: 'sm' | 'md' | 'lg';
}

const colsClassByBreakpoint: Record<string, Record<number, string>> = {
  base: { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 6: 'grid-cols-6', 12: 'grid-cols-12' },
  sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 6: 'sm:grid-cols-6', 12: 'sm:grid-cols-12' },
  md: { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 6: 'md:grid-cols-6', 12: 'md:grid-cols-12' },
  lg: { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 6: 'lg:grid-cols-6', 12: 'lg:grid-cols-12' },
  xl: { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 6: 'xl:grid-cols-6', 12: 'xl:grid-cols-12' },
};

const gapClass: Record<NonNullable<GridProps['gap']>, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

/** The shared layout grid (Section 1.6 / Phase 1's grid-system requirement). Column classes are direction-agnostic by construction — CSS Grid's `grid-cols-*` places tracks along the inline axis, which already flips with `dir="rtl"`, so no logical-property workaround is needed here the way it is for margin/padding. */
export function Grid({ cols = { base: 1 }, gap = 'md', className, children, ...props }: GridProps) {
  const colClasses = Object.entries(cols).map(
    ([breakpoint, count]) => colsClassByBreakpoint[breakpoint]?.[count as number],
  );

  return (
    <div className={cn('grid', gapClass[gap], ...colClasses, className)} {...props}>
      {children}
    </div>
  );
}
