'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorPatients } from '@/features/doctor/hooks/use-doctor-patients';
import type { AppointmentStatus } from '@/features/doctor/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';

const badgeVariantByStatus: Record<AppointmentStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
  requested: 'warning',
  confirmed: 'primary',
  rescheduled: 'warning',
  cancelled: 'neutral',
  no_show: 'danger',
  completed: 'success',
};

/**
 * The Doctor Workspace's "Patients" page — a real, distinct-patient list
 * from `GET /appointments/doctor/patients` (every patient this doctor has
 * ever had a real appointment with, grouped server-side). No drill-through
 * to a per-patient detail page, since none exists yet -- a plain list, not a
 * fabricated navigable row.
 */
export function PatientsList() {
  const t = useTranslations('doctor.patients');
  const tStatus = useTranslations('doctor.patients.status');
  const format = useFormatter();
  const { data: patients, isLoading, isError } = useDoctorPatients();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-start">
        <thead>
          <tr className="border-b border-border-default text-xs text-text-tertiary">
            <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('columns.visitCount')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('columns.lastVisit')}</th>
            <th className="px-4 py-3 text-start font-medium">{t('columns.lastVisitStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.patientProfileId} className="border-b border-border-default last:border-0">
              <td className="px-4 py-3 text-sm font-medium text-text-primary">{patient.patientName}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">{patient.visitCount}</td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {format.dateTime(new Date(patient.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <Badge variant={badgeVariantByStatus[patient.lastVisitStatus]}>{tStatus(patient.lastVisitStatus)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
