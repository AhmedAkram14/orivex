import type { ReactNode } from 'react';
import { UserCheck } from 'lucide-react';
import { EmptyState } from '@/shared/ui/empty-state';
import { WidgetContainer, type WidgetContainerProps } from '@/shared/ui/layout/widget-container';

export interface CurrentPatientCardProps extends Omit<WidgetContainerProps, 'children' | 'title' | 'content'> {
  title: string;
  emptyTitle: string;
  emptyDescription?: string;
  /** Typically a `PatientQueueCard` (without a wait-time, since they're already in consultation) — omitted when no one is currently in consultation. */
  content?: ReactNode;
}

/** The "who's in the room right now" widget — a `WidgetContainer` that shows either the current in-consultation entry or an honest empty state, never a fabricated placeholder patient. */
export function CurrentPatientCard({ title, emptyTitle, emptyDescription, content, ...props }: CurrentPatientCardProps) {
  return (
    <WidgetContainer title={title} {...props}>
      {content ?? <EmptyState icon={UserCheck} title={emptyTitle} description={emptyDescription} />}
    </WidgetContainer>
  );
}
