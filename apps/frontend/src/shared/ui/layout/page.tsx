import type { HTMLAttributes } from 'react';
import { PageContainer, type PageContainerProps } from '@/shared/ui/layout/page-container';
import { cn } from '@/shared/lib/cn';

export type PageProps = PageContainerProps;

/** The top-level wrapper every routed page (inside the dashboard shell) renders as its root — `PageContainer` under a name that reads as "this is a whole page," for symmetry with `PageHeader`/`PageActions`. Business modules compose `Page > PageHeader > Section*` rather than reinventing page-level spacing per module. */
export function Page({ className, ...props }: PageProps) {
  return <PageContainer className={className} {...props} />;
}

export interface DashboardGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Max columns at the widest breakpoint — the grid always starts at 1 column on mobile and scales up to this. Defaults to 3, the common KPI-row width; pass 4 for denser stat rows or 2 for a two-widget layout. */
  columns?: 2 | 3 | 4;
}

// Columns follow the width the grid really has (<main> is the size container), not the viewport:
// with the sidebar open a 1046px window leaves ~780px. In the two-column band a lone last widget
// spans the row instead of leaving a hole.
const columnsClass: Record<NonNullable<DashboardGridProps['columns']>, string> = {
  2: '@pane:grid-cols-2',
  3: '@pane:grid-cols-2 @wide:grid-cols-3 @pane:[&>*:last-child:nth-child(odd)]:col-span-2 @wide:[&>*:last-child:nth-child(odd)]:col-span-1',
  4: '@pane:grid-cols-2 @wide:grid-cols-4',
};

/**
 * The grid every dashboard arranges its widgets in -- 1 column below 640px of content, scaling up per
 * `columns`. `items-start`: a short widget keeps its own height instead of stretching half-empty to
 * match a tall neighbour.
 */
export function DashboardGrid({ columns = 3, className, ...props }: DashboardGridProps) {
  return <div className={cn('grid grid-cols-1 items-start gap-4', columnsClass[columns], className)} {...props} />;
}
