'use client';

import { CalendarX2, Search } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppointmentStatusBadge } from '@/features/doctor/components/appointments/appointment-status-badge';
import { CancelAppointmentDialog } from '@/features/doctor/components/appointments/cancel-appointment-dialog';
import { ReportsDateRangePicker } from '@/features/doctor/components/reports/reports-date-range-picker';
import { useDoctorScheduleAppointments } from '@/features/doctor/hooks/use-doctor-schedule-appointments';
import { isUpcomingAppointment, NON_TERMINAL_APPOINTMENT_STATUSES } from '@/features/doctor/lib/appointment-status';
import type { AppointmentStatus, DoctorScheduleAppointment } from '@/features/doctor/api/types';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const ALL_STATUSES: readonly AppointmentStatus[] = [
  'requested',
  'confirmed',
  'rescheduled',
  'completed',
  'cancelled',
  'no_show',
  'expired',
];

type AppointmentTab = 'upcoming' | 'past' | 'needsResolution';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysFromNowIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Default window: wide enough to catch a genuinely stale "Needs resolution" appointment and near-term upcoming work, without requesting this doctor's entire history by default (the doctor can widen it via the date-range picker). */
function getDefaultRange(): { dateFrom: string; dateTo: string } {
  return { dateFrom: daysFromNowIso(-90), dateTo: daysFromNowIso(90) };
}

/**
 * Phase 2 (Appointment Visibility & Consultation History): the previously
 * missing doctor Appointments view (`/doctor/appointments` 404'd before this
 * -- see IMPLEMENTATION_NOTES.md Phase 0). Built entirely against the
 * existing `GET /appointments/doctor/schedule?from=&to=&status=` route
 * (`useDoctorScheduleAppointments`) -- already a real, filterable,
 * date-ranged list of ALL this doctor's appointments (not just today's), so
 * no new backend route was needed for the list itself. Patient-name search
 * and the Upcoming/Past/Needs-resolution split are computed client-side over
 * that one response using the shared `isUpcomingAppointment`/
 * `NON_TERMINAL_APPOINTMENT_STATUSES` helpers -- the same definition every
 * other page on this frontend uses, so this page can never show a past
 * appointment as "upcoming".
 *
 * "Needs resolution" = end time in the past AND status non-terminal --
 * exactly the case Phase 0 found nowhere actionable on the frontend before.
 * The only action offered there is Cancel (see `CancelAppointmentDialog`'s
 * own comment for why Complete/No-show aren't options).
 *
 * Deliberately omits a fee-type (Free/Paid) filter and a payment-state
 * column: `DoctorScheduleAppointmentResponseDto` (this page's one real data
 * source) carries neither field -- see the Phase 2 backend-proposal note in
 * IMPLEMENTATION_NOTES.md rather than fabricating either.
 */
export function AppointmentsWorkspace() {
  const t = useTranslations('doctor.appointments');
  const format = useFormatter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [range, setRange] = useState(getDefaultRange);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [patientQuery, setPatientQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');

  const fromIso = new Date(`${range.dateFrom}T00:00:00.000Z`).toISOString();
  const toIso = new Date(`${range.dateTo}T23:59:59.999Z`).toISOString();
  const { data, isLoading, isError, refetch } = useDoctorScheduleAppointments(
    fromIso,
    toIso,
    statusFilter === 'all' ? undefined : statusFilter,
  );

  const appointments = data ?? [];
  const trimmedQuery = patientQuery.trim().toLowerCase();
  const filtered = trimmedQuery
    ? appointments.filter((appointment) => appointment.patientName.toLowerCase().includes(trimmedQuery))
    : appointments;

  const now = new Date();
  const buckets = useMemo(() => {
    const upcoming: DoctorScheduleAppointment[] = [];
    const past: DoctorScheduleAppointment[] = [];
    const needsResolution: DoctorScheduleAppointment[] = [];
    for (const appointment of filtered) {
      if (isUpcomingAppointment(appointment, now)) {
        upcoming.push(appointment);
        continue;
      }
      past.push(appointment);
      if (NON_TERMINAL_APPOINTMENT_STATUSES.has(appointment.status)) {
        needsResolution.push(appointment);
      }
    }
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    needsResolution.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return { upcoming, past, needsResolution };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // Command palette deep link (`?highlight=<appointmentId>`): land on the
  // tab that actually contains it, rather than always defaulting to Upcoming.
  useEffect(() => {
    if (!highlightId || !data) return;
    if (buckets.needsResolution.some((appointment) => appointment.id === highlightId)) {
      setActiveTab('needsResolution');
    } else if (buckets.past.some((appointment) => appointment.id === highlightId)) {
      setActiveTab('past');
    } else if (buckets.upcoming.some((appointment) => appointment.id === highlightId)) {
      setActiveTab('upcoming');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, data]);

  function renderRow(appointment: DoctorScheduleAppointment, showCancel: boolean) {
    const isHighlighted = appointment.id === highlightId;
    return (
      <li
        key={appointment.id}
        id={`appointment-${appointment.id}`}
        className={
          'flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ' +
          (isHighlighted ? 'border-primary ring-2 ring-primary/40' : 'border-border-default/70')
        }
      >
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={`/doctor/patients/${appointment.patientId}`} className="truncate text-sm font-medium text-text-primary hover:underline">
            {appointment.patientName}
          </Link>
          <p className="text-sm text-text-secondary">
            {format.dateTime(new Date(appointment.scheduledAt), { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {appointment.reasonForVisit && <p className="text-xs text-text-tertiary">{appointment.reasonForVisit}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AppointmentStatusBadge status={appointment.status} />
          {appointment.status === 'completed' && (
            <Link
              href={`/doctor/patients/${appointment.patientId}?tab=consultations`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('viewSummary')}
            </Link>
          )}
          {showCancel && (
            <CancelAppointmentDialog appointmentId={appointment.id} willRefund={appointment.status === 'confirmed'} />
          )}
        </div>
      </li>
    );
  }

  function renderList(items: DoctorScheduleAppointment[], emptyTitle: string, emptyDescription: string, showCancel: boolean) {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    if (items.length === 0) {
      return <EmptyState icon={CalendarX2} title={emptyTitle} description={emptyDescription} />;
    }
    return <ul className="flex flex-col gap-3">{items.map((appointment) => renderRow(appointment, showCancel))}</ul>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <ReportsDateRangePicker dateFrom={range.dateFrom} dateTo={range.dateTo} onChange={(dateFrom, dateTo) => setRange({ dateFrom, dateTo })} />
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="appointments-status-filter" className="text-xs text-text-tertiary">
              {t('filters.status')}
            </label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AppointmentStatus | 'all')}>
              <SelectTrigger id="appointments-status-filter" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
                {ALL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 min-w-48 flex-col gap-1">
            <label htmlFor="appointments-patient-search" className="text-xs text-text-tertiary">
              {t('filters.patientSearchLabel')}
            </label>
            <div className="relative">
              <Icon icon={Search} size="sm" className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <Input
                id="appointments-patient-search"
                value={patientQuery}
                onChange={(event) => setPatientQuery(event.target.value)}
                placeholder={t('filters.patientSearchPlaceholder')}
                className="ps-9"
              />
            </div>
          </div>
        </div>
      </Card>

      {isError && (
        <Alert variant="danger">
          {t('loadError')}{' '}
          <button type="button" className="font-medium underline" onClick={() => refetch()}>
            {t('retry')}
          </button>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AppointmentTab)}>
        <TabsList>
          <TabsTrigger value="upcoming">{t('tabs.upcoming', { count: buckets.upcoming.length })}</TabsTrigger>
          <TabsTrigger value="past">{t('tabs.past', { count: buckets.past.length })}</TabsTrigger>
          <TabsTrigger value="needsResolution">{t('tabs.needsResolution', { count: buckets.needsResolution.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {renderList(buckets.upcoming, t('empty.upcomingTitle'), t('empty.upcomingDescription'), false)}
        </TabsContent>
        <TabsContent value="past">
          {renderList(buckets.past, t('empty.pastTitle'), t('empty.pastDescription'), false)}
        </TabsContent>
        <TabsContent value="needsResolution" className="flex flex-col gap-3">
          {buckets.needsResolution.length > 0 && (
            <p className="text-sm text-text-secondary">{t('needsResolutionExplainer')}</p>
          )}
          {renderList(buckets.needsResolution, t('empty.needsResolutionTitle'), t('empty.needsResolutionDescription'), true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
