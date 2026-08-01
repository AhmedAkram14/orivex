import type { ReactNode } from 'react';
import { WidgetContainer, type WidgetContainerProps } from '@/shared/ui/layout/widget-container';
import { EmptyState } from '@/shared/ui/empty-state';

export interface WaitingQueueProps extends Omit<WidgetContainerProps, 'children' | 'title'> {
  title: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  /** Pre-keyed `<li>` elements (typically wrapping `PatientQueueCard`), in queue order — same caller-keyed convention as `RecentActivityContainer`. */
  items: ReactNode[];
  isEmpty: boolean;
}

/** The waiting-queue list — a `WidgetContainer` specialized the same way `RecentActivityContainer` specializes it for activity feeds, with a built-in empty state for "no one waiting right now." */
export function WaitingQueue({ title, emptyTitle, emptyDescription, items, isEmpty, ...props }: WaitingQueueProps) {
  return (
    <WidgetContainer title={title} {...props}>
      {isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="flex flex-col gap-2">{items}</ul>
      )}
    </WidgetContainer>
  );
}
