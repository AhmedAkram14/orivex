import type { HTMLAttributes, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface WidgetContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** Shows a skeleton in place of `children` — for a widget whose data is still loading, distinct from the widget not existing at all. */
  loading?: boolean;
}

/** The card shell every dashboard widget (a grid cell inside `DashboardGrid`) renders as its root — title/description/actions header plus a content slot, with a built-in loading skeleton so widgets don't each reinvent one. Distinct from `Section` (a page-level sub-region, not grid-cell-shaped) and from `Card` itself (generic; this is the dashboard-specific composition of it). */
export function WidgetContainer({
  title,
  description,
  actions,
  loading = false,
  className,
  children,
  ...props
}: WidgetContainerProps) {
  return (
    <Card className={cn('flex flex-col', className)} {...props}>
      {(title || actions) && (
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-1">
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
