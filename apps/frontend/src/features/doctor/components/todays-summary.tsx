'use client';

import { CalendarCheck, ClipboardCheck, Star, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDoctorReviews } from '@/features/consultation/hooks/use-doctor-reviews';
import { getRatingDisplay } from '@/features/consultation/lib/rating-display';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { usePendingApprovalAppointments } from '@/features/doctor/hooks/use-pending-approval-appointments';
import { Alert } from '@/shared/ui/alert';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

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

  const rating = getRatingDisplay(tRating, { averageRating: reviews?.averageRating, reviewCount: reviews?.reviewCount });

  return (
    // Responsive pass (Phase 7): `DashboardGrid columns={4}` starts at a
    // single stacked column below `sm` (its own generic `columnsClass`
    // table, shared by every other caller across the app) -- four
    // ~120px-tall KPI cards stacked full-width pushed all of Overview's
    // actionable content below the fold at 390px. Rather than change
    // `DashboardGrid`'s shared default (which would also reshape every
    // other page using `columns={4}`, out of this phase's scope), this one
    // grid is built locally with an explicit 2x2 base -- same pattern
    // `patients-list.tsx`'s own KPI row already uses instead of the shared
    // primitive. `sm`/`lg` unchanged from before (2-across, then 4-across).
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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
        value={rating.value}
        helperText={rating.helperText}
        loading={isLoading || reviewsLoading}
        href="/doctor/profile"
        className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      />
    </div>
  );
}
