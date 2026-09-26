'use client';

import { useTranslations } from 'next-intl';
import type { AppointmentStatus } from '@/features/doctor/api/types';
import { StatusBadge } from '@/shared/ui/status-badge';

export interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  /** Pass the slot times to get the time-aware "Awaiting outcome" for a confirmed appointment whose slot has passed. */
  timeAware?: { scheduledAt: string; endTime?: string };
  className?: string;
}

/**
 * Doctor-side appointment status: the label comes from
 * `publicPatient.appointmentStatus` (the existing EN/AR key set for this enum),
 * the colour from the ONE shared status map -- so the same status is the same
 * colour for a doctor, a patient and the command palette.
 */
export function AppointmentStatusBadge({ status, timeAware, className }: AppointmentStatusBadgeProps) {
  const t = useTranslations('publicPatient');
  return <StatusBadge status={status} label={t(`appointmentStatus.${status}`)} timeAware={timeAware} className={className} />;
}
