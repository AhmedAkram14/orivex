import { CalendarDays, Pill, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PrescriptionStatus } from '@/features/patient/api/types';
import { PrescriptionMetaItem } from '@/features/patient/components/prescriptions/prescription-meta-item';
import { PrescriptionStatusBadge } from '@/features/patient/components/prescriptions/prescription-status-badge';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

const accentByStatus: Record<PrescriptionStatus, string> = {
  active: 'border-s-success',
  expired: 'border-s-danger',
};

const iconWrapByStatus: Record<PrescriptionStatus, string> = {
  active: 'bg-success-subtle text-success-emphasis',
  expired: 'bg-danger-subtle text-danger-emphasis',
};

export interface PrescriptionCardProps {
  medicationName: string;
  /** Pre-formatted, localized dosage amount text (e.g. "50mg") — this component never formats a raw number itself. */
  dosageAmount: string;
  frequencyLabel: string;
  prescribedBy: string;
  /** Pre-formatted, localized prescribed-date text (e.g. "Aug 30, 2026"). */
  prescribedAtLabel: string;
  status: PrescriptionStatus;
  statusLabel: ReactNode;
  /** Real free-text instructions a doctor entered — never a fabricated "morning"/"with food" schedule the domain doesn't structure. */
  instructions?: string;
  className?: string;
}

/**
 * A single prescription as a large horizontal card (Prescriptions Redesign)
 * -- a status-colored left accent border, a medication icon, a meta-pill row
 * (prescribed date, prescriber), and the real free-text `instructions` on
 * the trailing edge when present. No refill count, time-of-day, or doctor
 * specialty is rendered: none of those exist on the real `Prescription`
 * domain (see `types.ts`'s own comments), so none is ever fabricated here.
 * No per-card menu either -- there is no real per-prescription action
 * (cancel/reorder/etc.) in this domain yet, and a menu with nothing real in
 * it is a dead control.
 */
export function PrescriptionCard({
  medicationName,
  dosageAmount,
  frequencyLabel,
  prescribedBy,
  prescribedAtLabel,
  status,
  statusLabel,
  instructions,
  className,
}: PrescriptionCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border-default border-s-4 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between',
        accentByStatus[status],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', iconWrapByStatus[status])}>
          <Icon icon={Pill} size="md" />
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">
              {medicationName} {dosageAmount}
            </p>
            <PrescriptionStatusBadge status={status} label={statusLabel} />
          </div>
          <p className="text-sm text-text-secondary">{frequencyLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PrescriptionMetaItem icon={CalendarDays}>{prescribedAtLabel}</PrescriptionMetaItem>
            <PrescriptionMetaItem icon={UserRound}>{prescribedBy}</PrescriptionMetaItem>
          </div>
        </div>
      </div>

      {instructions && (
        <div className="rounded-md bg-secondary-subtle px-3 py-2 text-xs text-text-secondary sm:max-w-56 sm:text-end">
          {instructions}
        </div>
      )}
    </div>
  );
}
