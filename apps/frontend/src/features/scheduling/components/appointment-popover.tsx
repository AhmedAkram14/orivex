'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { DoctorScheduleAppointment } from '@/features/doctor/api/types';
import { doctorScheduleKeys } from '@/features/doctor/hooks/query-keys';
import { useApproveAppointment } from '@/features/doctor/hooks/use-approve-appointment';
import { useDeclineAppointment } from '@/features/doctor/hooks/use-decline-appointment';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/ui/popover';
import { Textarea } from '@/shared/ui/textarea';

export interface AppointmentPopoverProps {
  /** The appointment to show; `null` closes the popover. */
  appointment: DoctorScheduleAppointment | null;
  /** The clicked calendar block's on-screen rectangle -- the popover opens beside it. */
  anchorRect: { top: number; left: number; width: number; height: number } | null;
  onClose: () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

/**
 * The card that opens when an appointment is clicked on the Schedule
 * calendar: patient, visit details, reason and the actions that really
 * apply. A pending request (`requested`) can be approved or declined right
 * here -- the same two backend actions, with the same rules, as the Patient
 * Queue's "Pending approval" list (Approve is one explicit click; Decline
 * asks for an optional reason and needs a second confirming click). Every
 * other appointment offers navigation only: nothing here can move, resize or
 * otherwise change an appointment, because the backend has no such route.
 */
export function AppointmentPopover({ appointment, anchorRect, onClose }: AppointmentPopoverProps) {
  const t = useTranslations('doctor.schedule.popover');
  const tQueue = useTranslations('doctor.queue.pendingApproval');
  const tStatus = useTranslations('doctor.appointments.status');
  const tType = useTranslations('doctor.schedule.appointmentType');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const approve = useApproveAppointment();
  const decline = useDeclineAppointment();
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [actionError, setActionError] = useState<'approve' | 'decline' | null>(null);

  function close() {
    setIsDeclining(false);
    setDeclineReason('');
    setActionError(null);
    onClose();
  }

  function afterAction() {
    // The approve/decline hooks refresh the queue and dashboard; the Schedule's
    // own appointment list must refresh too so the calendar block updates.
    queryClient.invalidateQueries({ queryKey: doctorScheduleKeys.all });
    close();
  }

  const open = appointment !== null && anchorRect !== null;
  const start = appointment ? new Date(appointment.scheduledAt) : null;
  const end = appointment?.endTime ? new Date(appointment.endTime) : null;
  const isPending = appointment?.status === 'requested';

  return (
    <Popover open={open} onOpenChange={(next) => !next && close()}>
      {anchorRect && (
        <PopoverAnchor
          style={{ position: 'fixed', top: anchorRect.top, left: anchorRect.left, width: anchorRect.width, height: anchorRect.height, pointerEvents: 'none' }}
        />
      )}
      <PopoverContent align="start" side="right" collisionPadding={16} className="w-80 rounded-xl p-5" aria-label={appointment?.patientName}>
        {appointment && start && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                {appointment.avatarUrl && <AvatarImage src={appointment.avatarUrl} alt="" />}
                <AvatarFallback>{initialsOf(appointment.patientName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-lg font-semibold text-text-primary">{appointment.patientName}</p>
                <p className="text-sm text-text-secondary">{appointment.appointmentType ? tType(appointment.appointmentType) : t('noVisitType')}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-text-tertiary">{t('date')}</dt>
                <dd className="font-medium text-text-primary">{format.dateTime(start, { dateStyle: 'medium' })}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-tertiary">{t('time')}</dt>
                <dd className="font-medium text-text-primary">
                  {format.dateTime(start, { timeStyle: 'short' })}
                  {end && ` – ${format.dateTime(end, { timeStyle: 'short' })}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-tertiary">{t('status')}</dt>
                <dd>
                  <Badge variant={isPending ? 'warning' : appointment.status === 'cancelled' ? 'danger' : appointment.status === 'confirmed' ? 'success' : 'neutral'}>
                    {tStatus(appointment.status)}
                  </Badge>
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-text-primary">{t('reason')}</p>
              <p className="text-sm text-text-secondary">{appointment.reasonForVisit || t('noReason')}</p>
            </div>

            {actionError && <Alert variant="danger">{actionError === 'approve' ? tQueue('approveError') : tQueue('declineError')}</Alert>}

            {isPending ? (
              isDeclining ? (
                <div className="flex flex-col gap-2 border-t border-border-default pt-3">
                  <label htmlFor="schedule-decline-reason" className="text-xs font-medium text-text-tertiary">
                    {tQueue('declineReasonLabel')}
                  </label>
                  <Textarea
                    id="schedule-decline-reason"
                    value={declineReason}
                    onChange={(event) => setDeclineReason(event.target.value)}
                    placeholder={tQueue('declineReasonPlaceholder')}
                    className="min-h-16"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsDeclining(false)}>
                      {tQueue('cancel')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      loading={decline.isPending}
                      onClick={() =>
                        decline.mutate(
                          { appointmentId: appointment.id, reason: declineReason.trim() || undefined },
                          { onSuccess: afterAction, onError: () => setActionError('decline') },
                        )
                      }
                    >
                      {tQueue('confirmDecline')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-danger text-danger hover:bg-danger-subtle"
                    onClick={() => {
                      setActionError(null);
                      setIsDeclining(true);
                    }}
                  >
                    {tQueue('decline')}
                  </Button>
                  <Button
                    type="button"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    loading={approve.isPending}
                    onClick={() => {
                      setActionError(null);
                      approve.mutate(appointment.id, { onSuccess: afterAction, onError: () => setActionError('approve') });
                    }}
                  >
                    {tQueue('approve')}
                  </Button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline">
                  <Link href={`/doctor/patients/${appointment.patientId}`}>{t('patientChart')}</Link>
                </Button>
                <Button asChild>
                  <Link href={`/doctor/appointments?highlight=${appointment.id}`}>{t('viewAppointment')}</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
