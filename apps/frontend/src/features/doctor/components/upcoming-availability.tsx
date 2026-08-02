'use client';

import { CalendarClock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { getUpcomingAvailabilityDays, isSameDay } from '@/features/doctor/lib/week';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { combineDateAndTime } from '@/features/scheduling/utils/time';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { cn } from '@/shared/lib/cn';

const TILE_COUNT = 4;

/**
 * The redesigned Overview page's "Upcoming Availability" widget — the same
 * real recurring-availability source `NextAvailabilityCard` already reduces
 * to a single slot, here expanded to the next `TILE_COUNT` real working
 * days via `getUpcomingAvailabilityDays`. Real hours per tile, never
 * fabricated placeholder dates.
 */
export function UpcomingAvailability() {
  const t = useTranslations('doctor.dashboard.availability');
  const tDashboard = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: availability, isLoading, isError } = useDoctorAvailability();

  // Fixed height shared with `TodaysProgress`/`RecentActivity`, with the
  // list itself (not the whole card) scrolling internally -- see
  // `TodaysProgress`'s own comment for why the row no longer stretches to
  // whichever sibling widget is naturally tallest.
  const widgetClassName = 'h-[380px] rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]';
  const contentClassName = 'overflow-y-auto';
  const widgetTitle = <span className="text-xl font-semibold">{t('title')}</span>;

  if (isError) {
    return (
      <WidgetContainer title={widgetTitle} className={widgetClassName} contentClassName={contentClassName}>
        <Alert variant="danger">{t('loadError')}</Alert>
      </WidgetContainer>
    );
  }

  if (isLoading) {
    return (
      <WidgetContainer title={widgetTitle} className={widgetClassName} contentClassName={contentClassName}>
        <Skeleton className="h-24 w-full" />
      </WidgetContainer>
    );
  }

  const days = availability ? getUpcomingAvailabilityDays(availability, new Date(), TILE_COUNT) : [];

  return (
    <WidgetContainer title={widgetTitle} className={widgetClassName} contentClassName={contentClassName}>
      {days.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ul className="flex flex-col divide-y divide-border-default">
          {days.map(({ date, day }) => {
            const today = isSameDay(date, new Date());
            return (
              <li key={date.toISOString()} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      today ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-text-tertiary',
                    )}
                  >
                    <Icon icon={CalendarClock} size="md" />
                  </span>
                  <p className="text-sm font-medium text-text-primary">
                    {today ? tDashboard('today') : format.dateTime(date, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm text-text-secondary">
                  {format.dateTime(combineDateAndTime(new Date(0, 0, 0), day.hours.start), { hour: 'numeric' })}
                  {' – '}
                  {format.dateTime(combineDateAndTime(new Date(0, 0, 0), day.hours.end), { hour: 'numeric' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
