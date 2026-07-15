import { MapPin, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

export type AppointmentCardStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
export type AppointmentCardType = 'in-person' | 'video';

const badgeVariantByStatus: Record<AppointmentCardStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  upcoming: 'info',
  'in-progress': 'warning',
  completed: 'success',
  cancelled: 'neutral',
};

export interface AppointmentCardProps {
  /** Pre-formatted, localized date+time text (e.g. "Jul 20, 2026, 10:00 AM") — this component never formats a date itself. */
  scheduledAtLabel: string;
  /** The other party's name — a doctor's name from the patient's viewpoint, a patient's name from a future doctor-facing reuse. Deliberately generic (not `doctorName`) so this component isn't patient-viewpoint-locked. */
  counterpartyName: string;
  counterpartyDetail?: string;
  status: AppointmentCardStatus;
  statusLabel: ReactNode;
  type: AppointmentCardType;
  typeLabel: ReactNode;
  location?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * A single appointment entry — date/time, the other party's name + detail
 * (e.g. specialization), a status badge, and an in-person/video indicator.
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
  type,
  typeLabel,
  location,
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
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Icon icon={type === 'video' ? Video : MapPin} size="sm" />
          {typeLabel}
          {location && type === 'in-person' && <span> · {location}</span>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
