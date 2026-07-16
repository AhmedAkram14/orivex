import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';

// Matches ConsultationModule's real AppointmentStatus enum exactly.
export type AppointmentCardStatus = 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed';

const badgeVariantByStatus: Record<AppointmentCardStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  requested: 'info',
  confirmed: 'info',
  rescheduled: 'warning',
  cancelled: 'neutral',
  no_show: 'neutral',
  completed: 'success',
};

export interface AppointmentCardProps {
  /** Pre-formatted, localized date+time text (e.g. "Jul 20, 2026, 10:00 AM") — this component never formats a date itself. */
  scheduledAtLabel: string;
  /** The other party's name — a doctor's name from the patient's viewpoint, a patient's name from a future doctor-facing reuse. Deliberately generic (not `doctorName`) so this component isn't patient-viewpoint-locked. */
  counterpartyName: string;
  counterpartyDetail?: string;
  status: AppointmentCardStatus;
  statusLabel: ReactNode;
  /** Pre-formatted, localized consultation-type text (e.g. "Free consultation") — matches ConsultationType (free/paid), not an in-person/video distinction that doesn't exist on the backend. */
  consultationTypeLabel: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * A single appointment entry — date/time, the other party's name + detail
 * (e.g. specialization), a status badge, and the consultation type.
 * Reusable across any appointment list (Patient Portal's Upcoming/History
 * views today; a future Doctor or Admin appointment list could reuse it
 * unchanged, since nothing here assumes the viewer's role) — deliberately
 * placed under `shared/ui/appointments/`, mirroring `shared/ui/queue/`'s
 * and `shared/ui/schedule/`'s existing subfolder convention.
 */
export function AppointmentCard({
  scheduledAtLabel,
  counterpartyName,
  counterpartyDetail,
  status,
  statusLabel,
  consultationTypeLabel,
  actions,
  className,
}: AppointmentCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border-default bg-surface p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{scheduledAtLabel}</p>
          <Badge variant={badgeVariantByStatus[status]}>{statusLabel}</Badge>
        </div>
        <p className="text-sm text-text-secondary">
          {counterpartyName}
          {counterpartyDetail && <span className="text-text-tertiary"> · {counterpartyDetail}</span>}
        </p>
        <p className="text-xs text-text-tertiary">{consultationTypeLabel}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
