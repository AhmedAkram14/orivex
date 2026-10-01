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
 * match a tall neighbour. One `--card-gap` on both axes, so its rows sit as far apart as its columns.
 */
export function DashboardGrid({ columns = 3, className, ...props }: DashboardGridProps) {
  return <div data-slot="dashboard-grid" className={cn('grid grid-cols-1 items-start gap-(--card-gap)', columnsClass[columns], className)} {...props} />;
}

/**
 * Cards that belong together, stacked one `--card-gap` apart -- the same gap a `DashboardGrid` has between
 * its cells, so a group of full-width cards and grids keeps one rhythm. The `Page` puts `--group-gap`
 * between groups. Also a grid cell's column of cards (cards of different heights stay one gap apart).
 */
export function DashboardGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dashboard-group" className={cn('flex min-w-0 flex-col gap-(--card-gap)', className)} {...props} />;
}
