'use client';

import { useTranslations } from 'next-intl';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { Alert } from '@/shared/ui/alert';
import { CircularProgress } from '@/shared/ui/charts/circular-progress';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

/**
 * The redesigned Overview page's "Today's Progress" widget — a real ratio
 * (`completedToday / consultationsToday`, both from the same real
 * `useDoctorDashboardSummary()` the stats row already uses), rendered as a
 * plain-SVG circular-progress ring. A 0/0 day renders the same empty state
 * as every other "nothing today" widget on this page instead of a ring that
 * can only ever read 0% -- there is nothing to divide.
 */
export function TodaysProgress() {
  const t = useTranslations('doctor.dashboard.progress');
  const { data, isLoading, isError } = useDoctorDashboardSummary();

  // Sizes to its own content, like the rest of the bottom row (no fixed height, no inner scroll).
  const widgetClassName = 'rounded-(--r-card) border-border-default shadow-sm';
  const contentClassName = 'flex flex-col items-center justify-center';

  if (isError) {
    return (
      <WidgetContainer
        title={<span className="text-xl font-semibold">{t('title')}</span>}
        className={widgetClassName}
        contentClassName={contentClassName}
      >
        <Alert variant="danger">{t('loadError')}</Alert>
      </WidgetContainer>
    );
  }

  if (isLoading) {
    return (
      <WidgetContainer
        title={<span className="text-xl font-semibold">{t('title')}</span>}
        className={widgetClassName}
        contentClassName={contentClassName}
      >
        <Skeleton className="mx-auto h-44 w-44 rounded-full" />
      </WidgetContainer>
    );
  }

  // `consultationsToday` is deliberately pending-only (Requested/Confirmed/
  // Rescheduled -- see `DoctorAppointmentsController.getDoctorDashboardSummary`),
  // so it IS the remaining count, not the day's total -- the total is
  // completed + still-pending, never `consultationsToday` alone.
  const completed = data?.completedToday ?? 0;
  const remaining = data?.consultationsToday ?? 0;
  const total = completed + remaining;

  return (
    <WidgetContainer
      title={<span className="text-xl font-semibold">{t('title')}</span>}
      className={widgetClassName}
      contentClassName={contentClassName}
    >
      {total === 0 ? (
        <EmptyState illustration="calendar-clear" title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <CircularProgress value={completed} max={total} size={176} strokeWidth={14} />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium text-text-primary">{t('completedOfTotal', { completed, total })}</p>
            <p className="text-xs text-text-tertiary">{t('remaining', { count: remaining })}</p>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
}
