import type { ReactNode } from 'react';
import { WidgetContainer, type WidgetContainerProps } from '@/shared/ui/layout/widget-container';
import { EmptyState } from '@/shared/ui/empty-state';

export interface RecentActivityContainerProps extends Omit<WidgetContainerProps, 'children' | 'title'> {
  title: string;
  /** Rendered when `items` is empty — a translated string, never a hardcoded default. */
  emptyTitle: string;
  emptyDescription?: string;
  /**
   * Pre-keyed `<li>` elements (each with a stable `key`, typically the
   * underlying activity's id), in display order. Required to already be
   * `<li>`s — rather than this component mapping opaque nodes into list
   * items itself — because only the caller has a stable identity to key
   * by; an index key would silently misattribute React state across
   * reorders/insertions.
   */
  items: ReactNode[];
  isEmpty: boolean;
}

/** A `WidgetContainer` specialized for a list of `ActivityCard`s, with a built-in empty state — the shape every "recent activity" panel (dashboard, business-module detail pages once built) reuses instead of each hand-rolling its own empty/list branching. */
export function RecentActivityContainer({
  title,
  emptyTitle,
  emptyDescription,
  items,
  isEmpty,
  ...props
}: RecentActivityContainerProps) {
  return (
    <WidgetContainer title={title} {...props}>
      {isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="flex flex-col gap-4">{items}</ul>
      )}
    </WidgetContainer>
  );
}
