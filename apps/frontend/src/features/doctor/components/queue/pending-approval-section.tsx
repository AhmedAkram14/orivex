'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useApproveAppointment } from '@/features/doctor/hooks/use-approve-appointment';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Section } from '@/shared/ui/layout/section';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Doctor-approval-workflow fix: every booking (Free or Paid) now lands
 * Requested and waits here until the doctor approves it -- this is the
 * doctor's own cue (also notified via NotifyDoctorOfAppointmentRequestedHandler)
 * that someone new is waiting, and the single place they act on it. Approving
 * moves the appointment into the real Patient Queue below (Confirmed +
 * ConsultationSession opened), it never appears in both lists at once.
 */
export function PendingApprovalSection() {
  const t = useTranslations('doctor.queue.pendingApproval');
  const format = useFormatter();
  const { data: pending, isLoading, isError } = usePendingApprovalAppointments();
  const approveAppointment = useApproveAppointment();

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <Section title={t('title')}>
      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {!isError && (!pending || pending.length === 0) && (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      )}

      {!isError && pending && pending.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pending.map((appointment) => (
            <li key={appointment.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{appointment.patientName}</p>
                      <Badge variant={appointment.consultationType === 'paid' ? 'warning' : 'neutral'}>
                        {t(`consultationType.${appointment.consultationType}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {appointment.reasonForVisit && (
                      <p className="text-sm text-text-tertiary">{appointment.reasonForVisit}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    loading={approveAppointment.isPending}
                    onClick={() => approveAppointment.mutate(appointment.id)}
                  >
                    {t('approve')}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {approveAppointment.isError && <Alert variant="danger">{t('approveError')}</Alert>}
    </Section>
  );
}
