'use client';

import { CalendarClock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { getUpcomingAvailabilityDays, isSameDay } from '@/features/doctor/lib/week';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { combineDateAndTime } from '@/features/scheduling/utils/time';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Alert } from '@/shared/ui/alert';
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

  // Sizes to its own content, like the rest of the bottom row (no fixed height, no inner scroll).
  const widgetClassName = 'rounded-(--r-card) border-border-default shadow-sm';
  const contentClassName = '';
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

  const days = availability ? getUpcomingAvailabilityDays(availability, getCairoNow(), TILE_COUNT) : [];

  return (
    <WidgetContainer title={widgetTitle} className={widgetClassName} contentClassName={contentClassName}>
      {days.length === 0 ? (
        // One quiet line: the greeting's day strip is the Overview's one illustrated empty state.
        <p className="text-sm text-text-secondary">{t('emptyLine')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default">
          {days.map(({ date, day }) => {
            const today = isSameDay(date, getCairoNow());
            return (
              <li key={date.toISOString()} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      today ? 'bg-primary-subtle text-primary-emphasis' : 'bg-secondary-subtle text-text-tertiary',
                    )}
                  >
                    <Icon icon={CalendarClock} size="md" />
                  </span>
                  <p className="text-sm font-medium text-text-primary">
                    {today ? tDashboard('today') : format.dateTime(date, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="shrink-0 text-sm whitespace-nowrap text-text-secondary">
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
