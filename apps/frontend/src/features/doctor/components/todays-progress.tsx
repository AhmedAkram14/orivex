'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useDoctorDashboardSummary } from '@/features/doctor/hooks/use-doctor-dashboard-summary';
import { useUpcomingSlots } from '@/features/scheduling/hooks/use-upcoming-slots';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Alert } from '@/shared/ui/alert';
import { CircularProgress } from '@/shared/ui/charts/circular-progress';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

export interface TodaysProgressProps {
  /**
   * `progress` (default): the booked day's "Today's Progress". `today`: an empty day's one "Today" card, standing in
   * for both Upcoming work and Today's Progress -- the ring at 0 of 0, "Nothing booked", the next opening.
   */
  variant?: 'progress' | 'today';
}

/**
 * The Overview's "Today's Progress" widget — a real ratio (`completedToday / (completedToday + consultationsToday)`,
 * both from the same `useDoctorDashboardSummary()` the stats row already uses) as a plain-SVG ring, with the next
 * open slot under it ("Next opening: Sat, Oct 3 · 9 AM") from the upcoming slots the greeting's day strip has already
 * loaded (the same query, no new request). A day with nothing booked still shows the ring, at 0 of 0; with no open
 * slot ahead the line is left out.
 */
export function TodaysProgress({ variant = 'progress' }: TodaysProgressProps) {
  const t = useTranslations('doctor.dashboard.progress');
  const tDashboard = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data, isLoading, isError } = useDoctorDashboardSummary();
  const { data: slots } = useUpcomingSlots();

  const title = (
    <span className="text-xl font-semibold">
      {variant === 'today' ? tDashboard('today') : t('title')}
    </span>
  );
  const widgetClassName = 'rounded-(--r-card) border-border-default shadow-sm';

  if (isError) {
    return (
      <WidgetContainer title={title} className={widgetClassName}>
        <Alert variant="danger">{t('loadError')}</Alert>
      </WidgetContainer>
    );
  }

  if (isLoading) {
    return (
      <WidgetContainer
        title={title}
        className={widgetClassName}
        contentClassName="flex items-center justify-center"
      >
        <Skeleton className="size-32 rounded-full" />
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

  const now = Date.now();
  const next = (slots ?? [])
    .map((slot) => new Date(slot.startTime))
    .filter((start) => start.getTime() > now)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const nextOpening = next
    ? t('nextOpening', {
        date: format.dateTime(next, { weekday: 'short', month: 'short', day: 'numeric' }),
        time: format.dateTime(next, {
          hour: 'numeric',
          ...(getCairoNow(next).getMinutes() !== 0 ? { minute: '2-digit' as const } : {}),
        }),
      })
    : null;
  const ringLabel = t('completedOfTotal', { completed, total });

  if (variant === 'today') {
    return (
      <WidgetContainer
        title={title}
        className={widgetClassName}
        contentClassName="flex items-center"
      >
        <div className="flex items-center gap-5">
          <CircularProgress
            value={completed}
            max={total}
            size={112}
            strokeWidth={10}
            label={ringLabel}
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body font-medium text-text-primary">{t('nothingBooked')}</p>
            {nextOpening && <p className="text-sm text-text-secondary">{nextOpening}</p>}
          </div>
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title={title}
      className={widgetClassName}
      contentClassName="flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center gap-3">
        <CircularProgress value={completed} max={total} size={128} strokeWidth={12} />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-text-primary">{ringLabel}</p>
          <p className="text-xs text-text-tertiary">{t('remaining', { count: remaining })}</p>
          {nextOpening && <p className="text-xs text-text-secondary">{nextOpening}</p>}
        </div>
      </div>
    </WidgetContainer>
  );
}
