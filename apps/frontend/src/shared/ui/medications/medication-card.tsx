import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';

export type MedicationCardStatus = 'active' | 'completed' | 'expired';

const badgeVariantByStatus: Record<MedicationCardStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  completed: 'neutral',
  expired: 'danger',
};

export interface MedicationCardProps {
  medicationName: string;
  /** Pre-formatted, localized dosage amount text (e.g. "500mg") — this component never formats a raw number itself. */
  dosageAmount: string;
  frequencyLabel: string;
  prescribedBy: string;
  /** Pre-formatted, localized prescribed-date text (e.g. "Jul 1, 2026") — this component never formats a date itself. */
  prescribedAtLabel: string;
  status: MedicationCardStatus;
  statusLabel: ReactNode;
  instructions?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * A single prescription entry — medication name, dosage, prescriber +
 * prescribed date, and a status badge. Reusable across the Active/Previous
 * medication lists (milestone 5). There is no "refill" concept anywhere in
 * the real Prescription domain (no refill count, no pharmacy integration)
 * and no structured "doses per day" count (`frequency` is unstructured
 * free-text a doctor typed) -- neither is rendered here; a raw dose-count
 * visualization belongs to `DosageVisualization` for contexts that actually
 * have a real count to show, not this card.
 */
export function MedicationCard({
  medicationName,
  dosageAmount,
  frequencyLabel,
  prescribedBy,
  prescribedAtLabel,
  status,
  statusLabel,
  instructions,
  actions,
  className,
}: MedicationCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{medicationName}</p>
          <Badge variant={badgeVariantByStatus[status]}>{statusLabel}</Badge>
        </div>
        <p className="text-sm text-text-secondary">
          {dosageAmount} · {frequencyLabel}
        </p>
        <p className="text-xs text-text-tertiary">
          {prescribedBy} · {prescribedAtLabel}
        </p>
        {instructions && <p className="text-sm text-text-secondary">{instructions}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
