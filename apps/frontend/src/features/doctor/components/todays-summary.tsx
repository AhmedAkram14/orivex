'use client';

import { CalendarCheck, ClipboardCheck, Star, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

// A rating built on a handful of reviews reads as evidence, not marketing --
// same threshold reasoning as the public Doctor Card's Top Rated/Most Booked
// ribbons. Below it, the count is withheld rather than headlining "(2
// ratings)" next to a rounded average.
const MIN_RATING_COUNT_TO_DISPLAY = 5;

/**
 * The Doctor Workspace's "Today's Summary" row — real counts from the
 * `/doctor/dashboard-summary` endpoint plus the real pending-approval count
 * (the one figure on this row that actually demands a response, so it leads)
 * and the doctor's own real rating aggregate (`useDoctorReviews`, the same
 * source `DoctorRatingSummary` uses on the public profile), honest "no
 * reviews yet" fallback instead of a fabricated figure. No trend arrows:
 * there's no historical snapshot to diff against. Every card is a real,
 * distinct drill-through link -- "Completed today" was dropped from this row
 * (Today's Progress already surfaces that same count as "X of Y done"
 * immediately below) rather than left as a fourth look-alike tile with
 * nowhere to go.
 */
export function TodaysSummary() {
  const t = useTranslations('doctor.dashboard');
  const tQueue = useTranslations('doctor.queue');
  const tRating = useTranslations('consultation.rating');
  const { data, isLoading, isError } = useDoctorDashboardSummary();
  const { data: profile } = useDoctorProfile();
  const { data: reviews, isLoading: reviewsLoading } = useDoctorReviews(profile?.id);
  const { data: pending, isLoading: pendingLoading } = usePendingApprovalAppointments();

  if (isError) {
    return <Alert variant="danger">{t('summaryLoadError')}</Alert>;
  }

  const ratingValue =
    reviews && reviews.reviewCount >= MIN_RATING_COUNT_TO_DISPLAY && reviews.averageRating != null
      ? reviews.averageRating.toFixed(1)
      : tRating('noReviewsYet');

  const helperText =
    reviews && reviews.reviewCount >= MIN_RATING_COUNT_TO_DISPLAY
      ? t('allTimeReviewCount', { count: reviews.reviewCount })
      : t('allTime');

  return (
    <DashboardGrid columns={4} className="gap-6">
      <LinkableStatCard
        size="lg"
        icon={ClipboardCheck}
        iconClassName="bg-primary-subtle text-primary-emphasis"
        label={tQueue('stats.pendingApproval.title')}
        value={String(pending?.length ?? 0)}
        loading={pendingLoading}
        href="/doctor/queue"
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
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
        icon={Star}
        // Amber, not blue -- matches the Star icon everywhere else it
        // appears (Profile page's hero rating stat, the actual review
        // stars), so "rating" reads as one consistent accent across pages.
        iconClassName="bg-warning-subtle text-warning-emphasis"
        label={t('averageRating')}
        value={ratingValue}
        helperText={helperText}
        loading={isLoading || reviewsLoading}
        href="/doctor/profile"
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
    </DashboardGrid>
  );
}
