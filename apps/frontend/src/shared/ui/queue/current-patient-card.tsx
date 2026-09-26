import type { ReactNode } from 'react';

import { EmptyState } from '@/shared/ui/empty-state';
import { HeroSurface } from '@/shared/ui/hero-surface';

export interface CurrentPatientCardProps {
  title: string;
  emptyTitle: string;
  emptyDescription?: string;
  /** Typically a `PatientQueueCard` -- omitted when no one is currently in consultation. */
  content?: ReactNode;
  /** Shown under the empty state when nobody is in the room (e.g. the accent "Start consultation" for the next waiting patient). */
  emptyAction?: ReactNode;
  className?: string;
}

/** The "who's in the room right now" hero (doctor variant): the current in-consultation entry, or an honest empty state -- never a fabricated placeholder patient. */
export function CurrentPatientCard({ title, emptyTitle, emptyDescription, content, emptyAction, className }: CurrentPatientCardProps) {
  return (
    <HeroSurface variant="doctor" className={className}>
      <h2 className="mb-3 text-h2">{title}</h2>
      {content ?? (
        <EmptyState size="sm" illustration="waiting-room-empty" title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}
    </HeroSurface>
  );
}
