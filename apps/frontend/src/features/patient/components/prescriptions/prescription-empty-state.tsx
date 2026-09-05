import { PillBottle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';

export interface PrescriptionEmptyStateProps {
  title: string;
  description: string;
  /** Real routes only (e.g. Browse Doctors, Book Appointment) — omitted entirely when no relevant destination exists, never a dead button. */
  actions?: ReactNode;
}

/** A fuller empty state than the generic `EmptyState` primitive — used only here, where a real next action (browse doctors / book an appointment) exists to fill the empty space intentionally. */
export function PrescriptionEmptyState({ title, description, actions }: PrescriptionEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-default py-14 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
        <Icon icon={PillBottle} size="lg" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="max-w-xs text-sm text-text-secondary">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
