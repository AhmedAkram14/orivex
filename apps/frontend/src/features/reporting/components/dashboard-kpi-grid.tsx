'use client';

import {
  Activity,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Clock,
  CreditCard,
  Hourglass,
  Star,
  Stethoscope,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDashboardKpis } from '@/features/reporting/hooks/use-dashboard-kpis';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

export interface DashboardKpiGridProps {
  filter: ReportFilterParams;
  refetchIntervalMs: number | false;
}

/**
 * Every linkable KPI points at the existing real page that already shows
 * the underlying records (Drill Down requirement) -- Doctors/Patients to
 * `/admin/users`, Verification counts to `/admin/verification-queue`.
 * Deliberately unfiltered: neither page reads a query-string filter today,
 * so appending one would be a link that looks filtered but silently isn't --
 * plain navigation to the real list is the honest version of this drill-down
 * until those pages gain filter support. Appointments/Payments/Telemedicine/
 * Notifications have no dedicated admin list screen at all yet, so those
 * tiles are static (their detail is one scroll away, in this same
 * dashboard's own panels below).
 */
export function DashboardKpiGrid({ filter, refetchIntervalMs }: DashboardKpiGridProps) {
  const t = useTranslations('admin.analytics.kpis');
  const { data, isLoading, isError } = useDashboardKpis(filter, refetchIntervalMs);

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const format = (value: number | null | undefined, fractionDigits = 0): string =>
    value === null || value === undefined ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });

  return (
    <DashboardGrid columns={4}>
      <LinkableStatCard icon={Stethoscope} label={t('totalDoctors')} value={format(data?.totalDoctors)} loading={isLoading} href="/admin/users" />
      <LinkableStatCard icon={BadgeCheck} label={t('verifiedDoctors')} value={format(data?.verifiedDoctors)} loading={isLoading} href="/admin/verification-queue" />
      <LinkableStatCard icon={Hourglass} label={t('pendingVerification')} value={format(data?.pendingVerification)} loading={isLoading} href="/admin/verification-queue" />
      <LinkableStatCard icon={Users} label={t('totalPatients')} value={format(data?.totalPatients)} loading={isLoading} href="/admin/users" />
      <LinkableStatCard icon={Activity} label={t('activePatients')} value={format(data?.activePatients)} loading={isLoading} />
      <LinkableStatCard icon={CalendarClock} label={t('totalAppointments')} value={format(data?.totalAppointments)} loading={isLoading} />
      <LinkableStatCard icon={CalendarCheck} label={t('completedAppointments')} value={format(data?.completedAppointments)} loading={isLoading} />
      <LinkableStatCard icon={CalendarX} label={t('cancelledAppointments')} value={format(data?.cancelledAppointments)} loading={isLoading} />
      <LinkableStatCard icon={Clock} label={t('upcomingAppointments')} value={format(data?.upcomingAppointments)} loading={isLoading} />
      <LinkableStatCard icon={Video} label={t('videoConsultations')} value={format(data?.videoConsultations)} loading={isLoading} />
      <LinkableStatCard icon={CreditCard} label={t('payments')} value={format(data?.payments)} loading={isLoading} />
      <LinkableStatCard icon={Wallet} label={t('revenue')} value={format(data?.revenue, 2)} loading={isLoading} />
      <LinkableStatCard
        icon={Clock}
        label={t('averageConsultationDuration')}
        value={data?.averageConsultationDurationMinutes == null ? t('notAvailable') : `${format(data.averageConsultationDurationMinutes, 1)} ${t('minutes')}`}
        loading={isLoading}
      />
      <LinkableStatCard
        icon={Star}
        label={t('averageRating')}
        value={data?.averageRating == null ? t('notAvailable') : format(data.averageRating, 2)}
        loading={isLoading}
      />
    </DashboardGrid>
  );
}
