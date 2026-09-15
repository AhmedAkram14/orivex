'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useApproveAppointment } from '@/features/doctor/hooks/use-approve-appointment';
import { useDeclineAppointment } from '@/features/doctor/hooks/use-decline-appointment';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Section } from '@/shared/ui/layout/section';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

/**
 * Consultation Pricing Lifecycle Completion (pay-then-confirm): only Free
 * bookings land here -- a Paid booking confirms automatically once the
 * patient's payment succeeds, never waiting on doctor approval at all (the
 * backend's own `getPendingApproval` filters Paid appointments out
 * entirely). This is the doctor's own cue (also notified via
 * NotifyDoctorOfAppointmentRequestedHandler) that a Free booking is
 * waiting, and the single place they act on it. Approving moves the
 * appointment into the real Patient Queue below (Confirmed +
 * ConsultationSession opened), it never appears in both lists at once.
 */
export function PendingApprovalSection() {
  const t = useTranslations('doctor.queue.pendingApproval');
  const format = useFormatter();
  const { data: pending, isLoading, isError } = usePendingApprovalAppointments();
  const approveAppointment = useApproveAppointment();
  const declineAppointment = useDeclineAppointment();
  // Doctor Patient Chart Phase 2: which appointment (if any) currently has
  // its inline decline-reason textarea open -- at most one at a time, a
  // simple affordance rather than a full dialog since Approve itself has
  // none either.
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  function startDecline(appointmentId: string) {
    setDecliningId(appointmentId);
    setDeclineReason('');
  }

  function cancelDecline() {
    setDecliningId(null);
    setDeclineReason('');
  }

  function submitDecline(appointmentId: string) {
    declineAppointment.mutate(
      { appointmentId, reason: declineReason.trim() || undefined },
      { onSuccess: () => setDecliningId(null) },
    );
  }

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <Section title={t('title')}>
      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {!isError && (!pending || pending.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
          </CardContent>
        </Card>
      )}

      {!isError && pending && pending.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pending.map((appointment) => (
            <li key={appointment.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={declineAppointment.isPending}
                        onClick={() => (decliningId === appointment.id ? cancelDecline() : startDecline(appointment.id))}
                      >
                        {t('decline')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        loading={approveAppointment.isPending}
                        onClick={() => approveAppointment.mutate(appointment.id)}
                      >
                        {t('approve')}
                      </Button>
                    </div>
                  </div>

                  {decliningId === appointment.id && (
                    <div className="flex flex-col gap-2 border-t border-border-default pt-3">
                      <label htmlFor={`decline-reason-${appointment.id}`} className="text-xs font-medium text-text-tertiary">
                        {t('declineReasonLabel')}
                      </label>
                      <Textarea
                        id={`decline-reason-${appointment.id}`}
                        value={declineReason}
                        onChange={(event) => setDeclineReason(event.target.value)}
                        placeholder={t('declineReasonPlaceholder')}
                        className="min-h-16"
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={cancelDecline}>
                          {t('cancel')}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={declineAppointment.isPending}
                          onClick={() => submitDecline(appointment.id)}
                        >
                          {t('confirmDecline')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {approveAppointment.isError && <Alert variant="danger">{t('approveError')}</Alert>}
      {declineAppointment.isError && <Alert variant="danger">{t('declineError')}</Alert>}
    </Section>
  );
}
