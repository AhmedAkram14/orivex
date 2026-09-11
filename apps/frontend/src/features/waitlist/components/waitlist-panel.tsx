'use client';

import { Clock3 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { useCancelWaitlistEntry } from '@/features/waitlist/hooks/use-cancel-waitlist-entry';
import { useJoinWaitlist } from '@/features/waitlist/hooks/use-join-waitlist';
import { useWaitlistEntries } from '@/features/waitlist/hooks/use-waitlist-entries';
import type { WaitlistConsultationType, WaitlistEntry } from '@/features/waitlist/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

const STATUS_VARIANT: Record<WaitlistEntry['status'], 'warning' | 'success' | 'neutral' | 'info'> = {
  waiting: 'neutral',
  notified: 'info',
  fulfilled: 'success',
  cancelled: 'neutral',
};

function todayDateKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * N8-Waitlist (ORIVEX Remaining Work Audit): join the waitlist for a doctor
 * when nothing bookable exists today, and track/cancel standing requests.
 * Mirrors DisputesWorkspace's own counterparty-picker pattern (same
 * client-side doctor-name resolution via the patient's own appointment
 * history, since WaitlistEntry carries only a doctorId).
 */
export function WaitlistPanel() {
  const t = useTranslations('waitlist');
  const format = useFormatter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultationType, setConsultationType] = useState<WaitlistConsultationType | 'any'>('any');
  const [earliestAcceptableAt, setEarliestAcceptableAt] = useState(todayDateKey());
  const [latestAcceptableAt, setLatestAcceptableAt] = useState('');

  const patientAppointments = usePatientAppointments();
  const entriesQuery = useWaitlistEntries();
  const joinWaitlist = useJoinWaitlist();
  const cancelEntry = useCancelWaitlistEntry();

  const isLoading = patientAppointments.isLoading || entriesQuery.isLoading;
  const isError = patientAppointments.isError || entriesQuery.isError;

  const doctors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const appointment of patientAppointments.data ?? []) {
      seen.set(appointment.doctorId, appointment.doctorName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [patientAppointments.data]);

  const doctorNameById = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor.name])), [doctors]);

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const activeDoctorIds = useMemo(
    () => new Set(entries.filter((entry) => entry.status === 'waiting' || entry.status === 'notified').map((entry) => entry.doctorId)),
    [entries],
  );
  const eligibleDoctors = doctors.filter((doctor) => !activeDoctorIds.has(doctor.id));

  function closePicker() {
    setPickerOpen(false);
    setSelectedDoctorId('');
    setConsultationType('any');
    setEarliestAcceptableAt(todayDateKey());
    setLatestAcceptableAt('');
    joinWaitlist.reset();
  }

  async function handleJoin() {
    if (!selectedDoctorId || !latestAcceptableAt) return;
    try {
      await joinWaitlist.mutateAsync({
        doctorId: selectedDoctorId,
        consultationType: consultationType === 'any' ? undefined : consultationType,
        earliestAcceptableAt: new Date(earliestAcceptableAt).toISOString(),
        latestAcceptableAt: new Date(latestAcceptableAt).toISOString(),
      });
      closePicker();
    } catch {
      // Inline error rendered below from joinWaitlist.error.
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
        <Button type="button" onClick={() => setPickerOpen(true)} disabled={eligibleDoctors.length === 0}>
          {t('joinAction')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('myWaitlistTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState icon={Clock3} title={t('emptyTitle')} description={t('emptyDescription')} />
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-border-default p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {doctorNameById.get(entry.doctorId) ?? t('unknownDoctor')}
                    </span>
                    <Badge variant={STATUS_VARIANT[entry.status]}>{t(`status.${entry.status}`)}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {t('rangeLabel', {
                      from: format.dateTime(new Date(entry.earliestAcceptableAt), { dateStyle: 'medium' }),
                      to: format.dateTime(new Date(entry.latestAcceptableAt), { dateStyle: 'medium' }),
                    })}
                  </p>
                  {(entry.status === 'waiting' || entry.status === 'notified') && (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={cancelEntry.isPending}
                        onClick={() => cancelEntry.mutate(entry.id)}
                      >
                        {t('cancelAction')}
                      </Button>
                    </div>
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
            <DialogTitle>{t('joinDialogTitle')}</DialogTitle>
            <DialogDescription>{t('joinDialogDescription')}</DialogDescription>
          </DialogHeader>

          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger aria-label={t('doctorLabel')}>
              <SelectValue placeholder={t('doctorPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {eligibleDoctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={consultationType} onValueChange={(value) => setConsultationType(value as WaitlistConsultationType | 'any')}>
            <SelectTrigger aria-label={t('consultationTypeLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('consultationTypeAny')}</SelectItem>
              <SelectItem value="free">{t('consultationTypeFree')}</SelectItem>
              <SelectItem value="paid">{t('consultationTypePaid')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2">
            <label htmlFor="waitlist-earliest" className="text-xs font-medium text-text-primary">
              {t('earliestLabel')}
            </label>
            <Input
              id="waitlist-earliest"
              type="date"
              value={earliestAcceptableAt}
              onChange={(event) => setEarliestAcceptableAt(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="waitlist-latest" className="text-xs font-medium text-text-primary">
              {t('latestLabel')}
            </label>
            <Input
              id="waitlist-latest"
              type="date"
              value={latestAcceptableAt}
              onChange={(event) => setLatestAcceptableAt(event.target.value)}
            />
          </div>

          {joinWaitlist.isError && <Alert variant="danger">{t('joinError')}</Alert>}

          <DialogFooter>
            <Button variant="outline" onClick={closePicker}>
              {t('cancel')}
            </Button>
            <Button
              loading={joinWaitlist.isPending}
              disabled={!selectedDoctorId || !latestAcceptableAt}
              onClick={handleJoin}
            >
              {t('confirmJoin')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
