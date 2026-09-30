'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useApproveAppointment } from '@/features/doctor/hooks/use-approve-appointment';
import { useDeclineAppointment } from '@/features/doctor/hooks/use-decline-appointment';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { Alert } from '@/shared/ui/alert';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DateBlock } from '@/shared/ui/date-block';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { Section } from '@/shared/ui/layout/section';
import { SkeletonRow } from '@/shared/ui/skeletons';
import { Textarea } from '@/shared/ui/textarea';

/**
 * Consultation Pricing Lifecycle Completion (pay-then-confirm): only Free
 * bookings land here -- a Paid booking confirms automatically once the
 * patient's payment succeeds, never waiting on doctor approval at all. Each
 * request is a card: the patient (avatar + name), the reason for the visit,
 * and the requested slot as a DateBlock; Accept is the primary action and
 * Decline (destructive) goes through a ConfirmDialog that states what the
 * patient will be told and takes an optional reason. Approving moves the
 * appointment into the real Patient Queue, it never appears in both lists.
 */
export function PendingApprovalSection() {
  const t = useTranslations('doctor.queue.pendingApproval');
  const format = useFormatter();
  const { data: pending, isLoading, isError, refetch } = usePendingApprovalAppointments();
  const approveAppointment = useApproveAppointment();
  const declineAppointment = useDeclineAppointment();
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  function submitDecline() {
    if (!decliningId) return;
    declineAppointment.mutate(
      { appointmentId: decliningId, reason: declineReason.trim() || undefined },
      {
        onSuccess: () => {
          setDecliningId(null);
          setDeclineReason('');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <Section title={t('title')}>
        <SkeletonRow />
        <SkeletonRow />
      </Section>
    );
  }

  return (
    <Section title={t('title')}>
      {isError && <ErrorState size="sm" description={t('loadError')} onRetry={() => void refetch()} />}

      {!isError && (!pending || pending.length === 0) && (
        <div className="rounded-(--r-card) border border-border-default bg-surface p-(--card-pad)">
          <EmptyState size="sm" illustration="waiting-room-empty" title={t('emptyTitle')} description={t('emptyDescription')} />
        </div>
      )}

      {!isError && pending && pending.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pending.map((appointment) => (
            <li
              key={appointment.id}
              className="flex flex-wrap items-center gap-4 rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs"
            >
              {/* The appointment-row pattern: DateBlock leads, the avatar rides inline with the name. */}
              <DateBlock date={appointment.scheduledAt} />
              <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-body font-medium text-text-primary">
                    <PersonAvatar name={appointment.patientName} size="xs" />
                    <bdi className="min-w-0">{appointment.patientName}</bdi>
                  </p>
                  <Badge variant={appointment.consultationType === 'paid' ? 'warning' : 'neutral'}>
                    {t(`consultationType.${appointment.consultationType}`)}
                  </Badge>
                </div>
                <p className="text-small text-text-tertiary">
                  {format.dateTime(new Date(appointment.scheduledAt), { timeStyle: 'short' })}
                </p>
                {appointment.reasonForVisit && <p className="text-small text-text-secondary">{appointment.reasonForVisit}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={declineAppointment.isPending}
                  onClick={() => {
                    setDecliningId(appointment.id);
                    setDeclineReason('');
                  }}
                >
                  {t('decline')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={approveAppointment.isPending && approveAppointment.variables === appointment.id}
                  onClick={() => approveAppointment.mutate(appointment.id)}
                >
                  {t('approve')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={decliningId !== null}
        onOpenChange={(next) => !next && setDecliningId(null)}
        title={t('decline')}
        description={t('declineConsequence')}
        confirmLabel={t('confirmDecline')}
        loading={declineAppointment.isPending}
        onConfirm={submitDecline}
      >
        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="decline-reason" className="text-caption font-medium text-text-tertiary">
            {t('declineReasonLabel')}
          </label>
          <Textarea
            id="decline-reason"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            placeholder={t('declineReasonPlaceholder')}
            className="min-h-16"
          />
        </div>
      </ConfirmDialog>

      {approveAppointment.isError && <Alert variant="danger">{t('approveError')}</Alert>}
      {declineAppointment.isError && <Alert variant="danger">{t('declineError')}</Alert>}
    </Section>
  );
}
