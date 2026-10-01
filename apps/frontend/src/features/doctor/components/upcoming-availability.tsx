'use client';

import { CalendarClock } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { getUpcomingAvailabilityDays, isSameDay } from '@/features/doctor/lib/week';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { combineDateAndTime, toMinutes } from '@/features/scheduling/utils/time';
import { Link } from '@/shared/i18n/navigation';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
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
 *
 * Today is listed whenever it is a working day, and never advertises hours that have passed: before its hours it
 * reads "9 AM – 7 PM", during them "until 7 PM", after them "Ended". "View schedule" opens Schedule.
 */
export function UpcomingAvailability() {
  const t = useTranslations('doctor.dashboard.availability');
  const tDashboard = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { data: availability, isLoading, isError } = useDoctorAvailability();

  // Sizes to its own content, like the rest of the bottom row (no fixed height, no inner scroll).
  const widgetClassName = 'rounded-(--r-card) border-border-default shadow-sm';
  const widgetTitle = <span className="text-xl font-semibold">{t('title')}</span>;
  const viewSchedule = (
    <Button asChild variant="ghost" size="sm">
      <Link href="/doctor/schedule">{t('viewSchedule')}</Link>
    </Button>
  );

  if (isError) {
    return (
      <WidgetContainer title={widgetTitle} className={widgetClassName} footer={viewSchedule}>
        <Alert variant="danger">{t('loadError')}</Alert>
      </WidgetContainer>
    );
  }

  if (isLoading) {
    return (
      <WidgetContainer title={widgetTitle} className={widgetClassName} footer={viewSchedule}>
        <Skeleton className="h-24 w-full" />
      </WidgetContainer>
    );
  }

  // From the start of today, so today stays listed after its hours (as "Ended") rather than silently dropping off.
  const cairoNow = getCairoNow();
  const startOfToday = new Date(cairoNow);
  startOfToday.setHours(0, 0, 0, 0);
  const days = availability ? getUpcomingAvailabilityDays(availability, startOfToday, TILE_COUNT) : [];
  const nowMinutes = cairoNow.getHours() * 60 + cairoNow.getMinutes();
  const hourLabel = (time: string) => format.dateTime(combineDateAndTime(new Date(0, 0, 0), time), { hour: 'numeric' });

  return (
    <WidgetContainer
      title={widgetTitle}
      className={widgetClassName}
      footer={viewSchedule}
      data-empty={days.length === 0 ? '' : undefined}
      contentClassName={days.length === 0 ? 'flex flex-col justify-center' : undefined}
    >
      {days.length === 0 ? (
        // One quiet line: the greeting's day strip is the Overview's one illustrated empty state.
        <p className="text-sm text-text-secondary">{t('emptyLine')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default">
          {days.map(({ date, day }) => {
            const today = isSameDay(date, cairoNow);
            // Today's own state: not started yet, under way, or over.
            const todayState = !today
              ? null
              : nowMinutes >= toMinutes(day.hours.end)
                ? 'ended'
                : nowMinutes >= toMinutes(day.hours.start)
                  ? 'running'
                  : 'ahead';
            return (
              <li key={date.toISOString()} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      today ? 'bg-primary-subtle text-primary-emphasis' : 'bg-secondary-subtle text-text-tertiary',
                    )}
                  >
                    <Icon icon={CalendarClock} size="md" />
                  </span>
                  <p className="text-sm font-medium text-text-primary">
                    {today ? tDashboard('today') : format.dateTime(date, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p
                  data-availability-hours=""
                  className={cn('shrink-0 text-sm whitespace-nowrap', todayState === 'ended' ? 'text-text-tertiary' : 'text-text-secondary')}
                >
                  {todayState === 'ended'
                    ? t('ended')
                    : todayState === 'running'
                      ? t('until', { time: hourLabel(day.hours.end) })
                      : `${hourLabel(day.hours.start)} – ${hourLabel(day.hours.end)}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetContainer>
  );
}
