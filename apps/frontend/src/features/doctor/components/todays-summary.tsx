'use client';

import { CalendarCheck, CheckCircle2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/** The Doctor Workspace's "Today's Summary" row — real counts from the mocked `/doctor/dashboard-summary` endpoint (honestly zero today, since no Consultation/Appointment module exists yet), never fabricated numbers. */
export function TodaysSummary() {
  const t = useTranslations('doctor.dashboard');
  const { data, isLoading } = useDoctorDashboardSummary();

  return (
    <DashboardGrid columns={3}>
      <LinkableStatCard
        icon={CalendarCheck}
        label={t('consultationsToday')}
        value={String(data?.consultationsToday ?? 0)}
        loading={isLoading}
        href="/doctor/schedule"
      />
      <LinkableStatCard
        icon={Users}
        label={t('patientsInQueue')}
        value={String(data?.patientsInQueue ?? 0)}
        loading={isLoading}
        href="/doctor/queue"
      />
      <LinkableStatCard
        icon={CheckCircle2}
        label={t('completedToday')}
        value={String(data?.completedToday ?? 0)}
        loading={isLoading}
      />
    </DashboardGrid>
  );
}
