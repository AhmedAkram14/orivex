import type { HTMLAttributes, ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';

export interface WidgetContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** An action at the card's foot (e.g. "View all"), pinned to the bottom: in a row of cards stretched to one height, the links line up along the bottom edge. */
  footer?: ReactNode;
  /** Shows a skeleton in place of `children` — for a widget whose data is still loading, distinct from the widget not existing at all. */
  loading?: boolean;
  /** Optional extra classes for the content slot — e.g. `overflow-y-auto` when the widget itself is given a fixed `className` height and needs its content, not the whole card, to scroll. Additive; omitted default behavior is unchanged. */
  contentClassName?: string;
  /** Heading level of the card title -- pages whose widgets sit directly under the H1 pass `h2` so the outline doesn't jump H1 -> H3. Defaults to `h3` (unchanged). */
  titleAs?: 'h2' | 'h3';
}

/** The card shell every dashboard widget (a grid cell inside `DashboardGrid`) renders as its root — title/description/actions header plus a content slot, with a built-in loading skeleton so widgets don't each reinvent one. Distinct from `Section` (a page-level sub-region, not grid-cell-shaped) and from `Card` itself (generic; this is the dashboard-specific composition of it). */
export function WidgetContainer({
  title,
  description,
  actions,
  footer,
  loading = false,
  className,
  contentClassName,
  titleAs,
  children,
  ...props
}: WidgetContainerProps) {
  const isScrollable = /overflow-(y-)?(auto|scroll)/.test(contentClassName ?? '');
  return (
    <Card className={cn('flex flex-col', className)} {...props}>
      {(title || actions) && (
        // Title and action never squeeze each other: the title may balance onto two lines, the action never wraps.
        // The header -> content distance is `--card-head-gap` where an area sets one (the patient Overview's
        // cards: 16px), and the card's own padding otherwise.
        <CardHeader data-slot="widget-header" className="flex-row items-center justify-between gap-3 space-y-0 pb-[var(--card-head-gap,var(--card-pad))]">
          {/* At least an action's height (a small button), so a header without one is as tall as a header with one. */}
          <div className="flex min-h-8 min-w-0 flex-col justify-center gap-1">
            {title && <CardTitle as={titleAs} className="text-base text-balance">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">{actions}</div>}
        </CardHeader>
      )}
      {/* A scrolling content slot must be keyboard-reachable (WCAG 2.1.1 / axe scrollable-region-focusable): without a tab stop a keyboard user can't scroll it. */}
      <CardContent
        data-slot="widget-content"
        className={cn('flex-1', footer && 'pb-2', isScrollable && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring', contentClassName)}
        {...(isScrollable ? { tabIndex: 0, ...(typeof title === 'string' ? { role: 'region', 'aria-label': title } : {}) } : {})}
      >
        {loading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      {footer && <CardFooter className="justify-end pb-3">{footer}</CardFooter>}
    </Card>
  );
}
