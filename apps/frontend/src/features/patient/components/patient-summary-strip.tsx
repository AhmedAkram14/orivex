'use client';

import { CalendarClock, History, MessageSquare, Pill } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useUnreadMessageCount } from '@/features/messaging/hooks/use-unread-message-count';
import { usePatientAppointments } from '@/features/patient/hooks/use-patient-appointments';
import { usePatientDashboardSummary } from '@/features/patient/hooks/use-patient-dashboard-summary';
import { selectUpcomingAppointments } from '@/features/patient/lib/upcoming-appointments';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Alert } from '@/shared/ui/alert';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/**
 * The compact summary strip (replaces the old three-tile Health Summary and
 * its repeated "View ..." links). The upcoming count comes from the SAME
 * shared selector as the hero, the upcoming list and the Appointments page
 * -- not the server's `upcomingAppointmentsCount`, which counts every
 * non-terminal appointment regardless of date (see IMPLEMENTATION_NOTES.md).
 * Active prescriptions and last visit stay on the real dashboard-summary
 * endpoint; unread messages on the real unread-count query.
 */
export function PatientSummaryStrip() {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const appointmentsQuery = usePatientAppointments();
  const summaryQuery = usePatientDashboardSummary();
  const unreadMessages = useUnreadMessageCount();

  if (appointmentsQuery.isError || summaryQuery.isError) {
    return <Alert variant="danger">{t('summaryLoadError')}</Alert>;
  }

  const upcoming = selectUpcomingAppointments(appointmentsQuery.data ?? [], getCairoNow());
  const next = upcoming[0];
  const lastVisitAt = summaryQuery.data?.lastVisitAt;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <LinkableStatCard
        icon={CalendarClock}
        label={t('upcomingAppointmentsTitle')}
        value={String(upcoming.length)}
        loading={appointmentsQuery.isLoading}
        href="/patient/appointments"
        helperText={next ? t('nextVisitHelper', { date: format.dateTime(new Date(next.scheduledAt), { month: 'short', day: 'numeric' }) }) : undefined}
      />
      <LinkableStatCard
        icon={Pill}
        label={t('activePrescriptionsTitle')}
        value={String(summaryQuery.data?.activePrescriptionsCount ?? 0)}
        loading={summaryQuery.isLoading}
        href="/patient/prescriptions"
        iconClassName="bg-success-subtle text-success-emphasis"
      />
      <LinkableStatCard
        icon={History}
        label={t('lastVisit')}
        value={lastVisitAt ? format.dateTime(new Date(lastVisitAt), { month: 'short', day: 'numeric' }) : '—'}
        helperText={lastVisitAt ? format.dateTime(new Date(lastVisitAt), { year: 'numeric' }) : t('noVisitsYet')}
        loading={summaryQuery.isLoading}
        href="/patient/records"
        iconClassName="bg-warning-subtle text-warning-emphasis"
      />
      <LinkableStatCard
        icon={MessageSquare}
        label={t('unreadMessagesTitle')}
        value={String(unreadMessages)}
        href="/patient/messages"
        iconClassName="bg-info-subtle text-info-emphasis"
      />
    </div>
  );
}
