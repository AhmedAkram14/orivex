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

const columnsClass: Record<NonNullable<DashboardGridProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/** The responsive grid every dashboard (role-specific or business-module) arranges its widgets in — 1 column on mobile, scaling up per `columns`. */
export function DashboardGrid({ columns = 3, className, ...props }: DashboardGridProps) {
  return <div className={cn('grid grid-cols-1 gap-4', columnsClass[columns], className)} {...props} />;
}
