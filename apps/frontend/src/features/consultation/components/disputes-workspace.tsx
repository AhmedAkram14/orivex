'use client';

import { AlertTriangle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useDoctorUpcomingWork } from '@/features/doctor/hooks/use-doctor-upcoming-work';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { useMyDisputes } from '@/features/consultation/hooks/use-my-disputes';
import { useRaiseDispute } from '@/features/consultation/hooks/use-raise-dispute';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import type { Dispute } from '@/features/consultation/api/types';

export interface DisputesWorkspaceProps {
  role: 'patient' | 'doctor';
}

const STATUS_VARIANT: Record<Dispute['status'], 'warning' | 'success' | 'neutral'> = {
  open: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
};

/**
 * I11 -- Admin dispute resolution (ORIVEX Remaining Work Audit): the
 * patient/doctor-facing surface -- raise a dispute about a real appointment
 * and track its status, mirroring `MessagingWorkspace`'s own
 * appointment-picker pattern (same client-side counterparty-name resolution,
 * since neither `Dispute` nor `MessageThread` carries a display name).
 */
export function DisputesWorkspace({ role }: DisputesWorkspaceProps) {
  const t = useTranslations('disputes');
  const format = useFormatter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [reason, setReason] = useState('');

  const patientAppointments = usePatientAppointments();
  const doctorUpcomingWork = useDoctorUpcomingWork();
  const disputesQuery = useMyDisputes();
  const raiseDispute = useRaiseDispute();

  const isLoading = (role === 'patient' ? patientAppointments.isLoading : doctorUpcomingWork.isLoading) || disputesQuery.isLoading;
  const isError = (role === 'patient' ? patientAppointments.isError : doctorUpcomingWork.isError) || disputesQuery.isError;

  const appointments = useMemo(() => {
    if (role === 'patient') {
      return (patientAppointments.data ?? []).map((appointment) => ({
        id: appointment.id,
        counterpartyName: appointment.doctorName,
        scheduledAt: appointment.scheduledAt,
      }));
    }
    return (doctorUpcomingWork.data ?? []).map((item) => ({ id: item.id, counterpartyName: item.title, scheduledAt: item.scheduledAt }));
  }, [role, patientAppointments.data, doctorUpcomingWork.data]);

  const counterpartyNameByAppointmentId = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment.counterpartyName])),
    [appointments],
  );

  const disputes = useMemo(() => disputesQuery.data ?? [], [disputesQuery.data]);
  const disputedAppointmentIds = useMemo(() => new Set(disputes.map((dispute) => dispute.appointmentId)), [disputes]);
  const eligibleAppointments = appointments.filter((appointment) => !disputedAppointmentIds.has(appointment.id));

  function closePicker() {
    setPickerOpen(false);
    setSelectedAppointmentId('');
    setReason('');
    raiseDispute.reset();
  }

  async function handleRaise() {
    if (!selectedAppointmentId || reason.trim().length === 0) return;
    try {
      await raiseDispute.mutateAsync({ appointmentId: selectedAppointmentId, reason });
      closePicker();
    } catch {
      // Inline error rendered below from raiseDispute.error.
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button type="button" onClick={() => setPickerOpen(true)} disabled={eligibleAppointments.length === 0}>
          {t('raiseAction')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('myDisputesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <EmptyState icon={AlertTriangle} title={t('emptyTitle')} description={t('emptyDescription')} />
          ) : (
            <ul className="flex flex-col gap-3">
              {disputes.map((dispute) => (
                <li key={dispute.id} className="flex flex-col gap-1 rounded-2xl border border-border-default p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {counterpartyNameByAppointmentId.get(dispute.appointmentId) ?? t('unknownCounterparty')}
                    </span>
                    <Badge variant={STATUS_VARIANT[dispute.status]}>{t(`status.${dispute.status}`)}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{dispute.reason}</p>
                  <p className="text-xs text-text-tertiary">
                    {format.dateTime(new Date(dispute.createdAt), { dateStyle: 'medium' })}
                  </p>
                  {dispute.status !== 'open' && dispute.resolutionNotes && (
                    <p className="text-xs text-text-tertiary">
                      {t('resolutionLabel')}: {dispute.resolutionNotes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={pickerOpen} onOpenChange={(open) => !open && closePicker()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('raiseDialogTitle')}</DialogTitle>
            <DialogDescription>{t('raiseDialogDescription')}</DialogDescription>
          </DialogHeader>

          <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
            <SelectTrigger aria-label={t('appointmentLabel')}>
              <SelectValue placeholder={t('appointmentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {eligibleAppointments.map((appointment) => (
                <SelectItem key={appointment.id} value={appointment.id}>
                  {appointment.counterpartyName} — {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('reasonPlaceholder')}
            rows={4}
          />

          {raiseDispute.isError && <Alert variant="danger">{t('raiseError')}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={closePicker}>
              {t('cancel')}
            </Button>
            <Button
              loading={raiseDispute.isPending}
              disabled={!selectedAppointmentId || reason.trim().length === 0}
              onClick={handleRaise}
            >
              {t('confirmRaise')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
