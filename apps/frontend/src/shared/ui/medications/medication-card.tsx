import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { DosageVisualization } from '@/shared/ui/medications/dosage-visualization';
import { cn } from '@/shared/lib/cn';

export type MedicationCardStatus = 'active' | 'completed' | 'expired';
export type MedicationCardRefillStatus = 'not-due' | 'due-soon' | 'due' | 'none-remaining';

const badgeVariantByStatus: Record<MedicationCardStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  completed: 'neutral',
  expired: 'danger',
};

const badgeVariantByRefillStatus: Record<MedicationCardRefillStatus, 'warning' | 'danger'> = {
  'not-due': 'warning',
  'due-soon': 'warning',
  due: 'danger',
  'none-remaining': 'danger',
};

export interface MedicationCardProps {
  medicationName: string;
  /** Pre-formatted, localized dosage amount text (e.g. "500mg") — this component never formats a raw number itself. */
  dosageAmount: string;
  dosesPerDay: number;
  frequencyLabel: string;
  prescribedBy: string;
  /** Pre-formatted, localized prescribed-date text (e.g. "Jul 1, 2026") — this component never formats a date itself. */
  prescribedAtLabel: string;
  status: MedicationCardStatus;
  statusLabel: ReactNode;
  refillStatus: MedicationCardRefillStatus;
  refillStatusLabel: ReactNode;
  /** A refill badge only renders for `due-soon`/`due`/`none-remaining` — an unremarkable `not-due` state isn't worth a badge's visual weight. */
  showRefillBadge?: boolean;
  refillsRemainingLabel?: string;
  instructions?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * A single prescription entry — medication name, dosage + a real dose-count
 * visualization, prescriber + prescribed date, a status badge, and an
 * optional refill-status badge. Reusable across the Active/Previous
 * medication lists (milestone 5).
 */
export function MedicationCard({
  medicationName,
  dosageAmount,
  dosesPerDay,
  frequencyLabel,
  prescribedBy,
  prescribedAtLabel,
  status,
  statusLabel,
  refillStatus,
  refillStatusLabel,
  showRefillBadge = false,
  refillsRemainingLabel,
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
          {showRefillBadge && <Badge variant={badgeVariantByRefillStatus[refillStatus]}>{refillStatusLabel}</Badge>}
        </div>
        <p className="text-sm text-text-secondary">
          {dosageAmount} · {frequencyLabel}
        </p>
        <DosageVisualization dosesPerDay={dosesPerDay} label={frequencyLabel} />
        <p className="text-xs text-text-tertiary">
          {prescribedBy} · {prescribedAtLabel}
        </p>
        {refillsRemainingLabel && <p className="text-xs text-text-tertiary">{refillsRemainingLabel}</p>}
        {instructions && <p className="text-sm text-text-secondary">{instructions}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
