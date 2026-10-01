'use client';

import { CalendarCheck, ClipboardCheck, Star, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { getRatingDisplay } from '@/features/consultation/lib/rating-display';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { ErrorState } from '@/shared/ui/error-state';
import { MetricStat, MetricStrip } from '@/shared/ui/metric-stat';

/**
 * The Doctor Workspace's "Today's Summary": one horizontal MetricStrip (the
 * page's single KPI row) of real counts from `/doctor/dashboard-summary`, the
 * real pending-approval count (the one figure that demands a response, so it
 * leads) and the doctor's own real rating aggregate, with an honest "no
 * reviews yet" fallback. No trend arrows: there is no historical snapshot to
 * diff against. Every stat is a real drill-through link. On a phone the strip
 * snap-scrolls sideways.
 */
export function TodaysSummary() {
  const t = useTranslations('doctor.dashboard');
  const tQueue = useTranslations('doctor.queue');
  const tRating = useTranslations('consultation.rating');
  const { data, isLoading, isError, refetch } = useDoctorDashboardSummary();
  const { data: profile } = useDoctorProfile();
  const { data: reviews, isLoading: reviewsLoading } = useDoctorReviews(profile?.id);
  const { data: pending, isLoading: pendingLoading } = usePendingApprovalAppointments();

  if (isError) {
    return <ErrorState size="sm" description={t('summaryLoadError')} onRetry={() => void refetch()} />;
  }

  const rating = getRatingDisplay(tRating, { averageRating: reviews?.averageRating, reviewCount: reviews?.reviewCount });

  return (
    <MetricStrip>
      <MetricStat
        variant="inline"
        icon={ClipboardCheck}
        label={tQueue('stats.pendingApproval.title')}
        value={String(pending?.length ?? 0)}
        helperText={t('kpiCaptionPendingApproval')}
        loading={pendingLoading}
        href="/doctor/queue"
      />
      <MetricStat
        variant="inline"
        icon={CalendarCheck}
        label={t('consultationsToday')}
        value={String(data?.consultationsToday ?? 0)}
        helperText={t('kpiCaptionConsultationsToday')}
        loading={isLoading}
        href="/doctor/schedule"
      />
      <MetricStat
        variant="inline"
        icon={Users}
        label={t('patientsInQueue')}
        value={String(data?.patientsInQueue ?? 0)}
        helperText={t('kpiCaptionPatientsInQueue')}
        loading={isLoading}
        href="/doctor/queue"
      />
      <MetricStat
        variant="inline"
        icon={Star}
        label={t('averageRating')}
        value={rating.value}
        helperText={rating.helperText}
        loading={isLoading || reviewsLoading}
        href="/doctor/profile"
      />
    </MetricStrip>
  );
}
