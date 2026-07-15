'use client';

import { CalendarClock, History, Pill } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { usePatientDashboardSummary } from '@/features/patient/hooks/use-patient-dashboard-summary';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/** The Patient Portal's "Health Summary" row — real counts from the mocked `/patient/dashboard-summary` endpoint (honestly zero today, since no Scheduling/Clinical module exists yet), never fabricated numbers. Mirrors the Doctor Workspace's `TodaysSummary`. */
export function HealthSummary() {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { data, isLoading } = usePatientDashboardSummary();

  return (
    <DashboardGrid columns={3}>
      <LinkableStatCard
        icon={CalendarClock}
        label={t('upcomingAppointmentsTitle')}
        value={String(data?.upcomingAppointmentsCount ?? 0)}
        loading={isLoading}
        href="/patient/appointments"
      />
      <LinkableStatCard
        icon={Pill}
        label={t('activePrescriptionsTitle')}
        value={String(data?.activePrescriptionsCount ?? 0)}
        loading={isLoading}
        href="/patient/prescriptions"
      />
      <LinkableStatCard
        icon={History}
        label={t('lastVisit')}
        value={data?.lastVisitAt ? format.dateTime(new Date(data.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' }) : t('noVisitsYet')}
        loading={isLoading}
      />
    </DashboardGrid>
  );
}
