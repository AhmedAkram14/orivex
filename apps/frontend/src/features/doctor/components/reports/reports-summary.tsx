'use client';

import { CalendarCheck, CheckCircle2, Star, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReportsSummary } from '@/features/doctor/hooks/use-doctor-reports-summary';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/**
 * The Doctor Workspace's "Reports" page — real appointment-status counts
 * plus the doctor's real rating aggregate from `GET
 * /appointments/doctor/reports-summary`. No charts/time-series: there is no
 * historical snapshot to plot one against, so none is fabricated.
 */
export function ReportsSummary() {
  const t = useTranslations('doctor.reports');
  const { data, isLoading, isError } = useDoctorReportsSummary();

  if (isError) {
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  const cancelledAndNoShow = (data?.cancelled ?? 0) + (data?.noShow ?? 0);

  return (
    <DashboardGrid columns={4}>
      <LinkableStatCard
        icon={CalendarCheck}
        iconClassName="bg-primary-subtle text-primary-emphasis"
        label={t('stats.totalAppointments')}
        value={String(data?.totalAppointments ?? 0)}
        loading={isLoading}
      />
      <LinkableStatCard
        icon={CheckCircle2}
        iconClassName="bg-success-subtle text-success-emphasis"
        label={t('stats.completed')}
        value={String(data?.completed ?? 0)}
        loading={isLoading}
      />
      <LinkableStatCard
        icon={XCircle}
        iconClassName="bg-danger-subtle text-danger-emphasis"
        label={t('stats.cancelledOrNoShow')}
        value={String(cancelledAndNoShow)}
        loading={isLoading}
      />
      <LinkableStatCard
        icon={Star}
        iconClassName="bg-warning-subtle text-warning-emphasis"
        label={t('stats.averageRating')}
        value={
          data?.averageRating != null
            ? t('stats.ratingValue', { rating: data.averageRating.toFixed(1), count: data.reviewCount })
            : t('stats.noReviewsYet')
        }
        loading={isLoading}
      />
    </DashboardGrid>
  );
}
