import type { ReactNode } from 'react';
import { Pill } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { StatusBadge } from '@/shared/ui/status-badge';
import { cn } from '@/shared/lib/cn';

export type MedicationCardStatus = 'active' | 'completed' | 'expired';

export interface MedicationCardProps {
  medicationName: string;
  /** Pre-formatted, localized dosage amount text (e.g. "500mg") — this component never formats a raw number itself. */
  dosageAmount: string;
  frequencyLabel: string;
  prescribedBy: string;
  /** Pre-formatted, localized prescribed-date text (e.g. "Jul 1, 2026") — this component never formats a date itself. */
  prescribedAtLabel: string;
  status: MedicationCardStatus;
  statusLabel: string;
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
        'flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-4 shadow-xs sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-secondary">
          <Icon icon={Pill} size="md" />
        </span>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-medium text-text-primary">{medicationName}</p>
          <StatusBadge status={status} label={statusLabel} />
        </div>
        <p className="text-sm text-text-secondary">
          {dosageAmount} · {frequencyLabel}
        </p>
        <p className="text-xs text-text-tertiary">
          {prescribedBy} · {prescribedAtLabel}
        </p>
        {instructions && <p className="text-small text-text-secondary">{instructions}</p>}
      </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
