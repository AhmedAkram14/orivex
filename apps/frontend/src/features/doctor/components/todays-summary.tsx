'use client';

import { CalendarCheck, CheckCircle2, Star, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/**
 * The Doctor Workspace's "Today's Summary" row — real counts from the
 * `/doctor/dashboard-summary` endpoint plus the doctor's own real rating
 * aggregate (`useDoctorReviews`, the same source `DoctorRatingSummary`
 * uses on the public profile), honest "no reviews yet" fallback instead of
 * a fabricated figure. No trend arrows: there's no historical snapshot to
 * diff against.
 */
export function TodaysSummary() {
  const t = useTranslations('doctor.dashboard');
  const tRating = useTranslations('consultation.rating');
  const { data, isLoading, isError } = useDoctorDashboardSummary();
  const { data: profile } = useDoctorProfile();
  const { data: reviews, isLoading: reviewsLoading } = useDoctorReviews(profile?.id);

  if (isError) {
    return <Alert variant="danger">{t('summaryLoadError')}</Alert>;
  }

  const ratingValue =
    reviews && reviews.reviewCount > 0 && reviews.averageRating != null
      ? reviews.averageRating.toFixed(1)
      : tRating('noReviewsYet');

  const helperText =
    reviews && reviews.reviewCount > 0
      ? tRating('reviewCount', { count: reviews.reviewCount })
      : undefined;

  return (
    <DashboardGrid columns={4} className="gap-6">
      <LinkableStatCard
        size="lg"
        icon={CalendarCheck}
        iconClassName="bg-info-subtle text-info-emphasis"
        label={t('consultationsToday')}
        value={String(data?.consultationsToday ?? 0)}
        loading={isLoading}
        href="/doctor/schedule"
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
      <LinkableStatCard
        size="lg"
        icon={Users}
        iconClassName="bg-warning-subtle text-warning-emphasis"
        label={t('patientsInQueue')}
        value={String(data?.patientsInQueue ?? 0)}
        loading={isLoading}
        href="/doctor/queue"
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
      <LinkableStatCard
        size="lg"
        icon={CheckCircle2}
        iconClassName="bg-success-subtle text-success-emphasis"
        label={t('completedToday')}
        value={String(data?.completedToday ?? 0)}
        loading={isLoading}
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
      <LinkableStatCard
        size="lg"
        icon={Star}
        iconClassName="bg-primary-subtle text-primary-emphasis"
        label={t('averageRating')}
        value={ratingValue}
        helperText={helperText}
        loading={isLoading || reviewsLoading}
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
    </DashboardGrid>
  );
}
