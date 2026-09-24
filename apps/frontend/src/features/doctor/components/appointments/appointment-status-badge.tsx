import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/shared/ui/badge';
import type { AppointmentStatus } from '@/features/doctor/api/types';

/**
 * Phase 2 (Appointment Visibility & Consultation History): the one shared
 * tone map for a full `AppointmentStatus` (requested/confirmed/rescheduled/
 * completed/cancelled/no_show/expired), extending the pattern already
 * established by `shared/ui/schedule/status-badge.tsx`'s `variantByTone`
 * (that map only covers Schedule's own slot-level tones, not the full
 * appointment status enum) and the local `appointmentBadgeVariant` map that
 * used to live only on the Patient Chart page. Reused by the Appointments
 * page, the Patient Chart's appointment rows, and the command palette's
 * appointment search results so the three surfaces can never disagree about
 * what color a given status renders as.
 */
export const APPOINTMENT_STATUS_BADGE_VARIANT: Record<AppointmentStatus, NonNullable<BadgeProps['variant']>> = {
  requested: 'neutral',
  confirmed: 'success',
  rescheduled: 'info',
  completed: 'primary',
  cancelled: 'danger',
  no_show: 'danger',
  expired: 'danger',
};

export interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

/** Reads its label from `publicPatient.appointmentStatus` -- the one existing, already-translated (EN/AR) key set for this exact enum, shared rather than duplicated under a second namespace. */
export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const t = useTranslations('publicPatient');
  return (
    <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANT[status]} className={className}>
      {t(`appointmentStatus.${status}`)}
    </Badge>
  );
}
