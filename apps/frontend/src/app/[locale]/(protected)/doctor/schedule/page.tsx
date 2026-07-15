'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { useDoctorAvailability } from '@/features/doctor/hooks/use-doctor-availability';
import { addWeeks, getWeekDayName, getWeekDays, isSameDay, startOfWeek } from '@/features/doctor/lib/week';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { AvailabilityBlock } from '@/shared/ui/schedule/availability-block';
import { CalendarHeader } from '@/shared/ui/schedule/calendar-header';
import { DailyTimeline, type DailyTimelineRow } from '@/shared/ui/schedule/daily-timeline';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { TimeSlot } from '@/shared/ui/schedule/time-slot';
import { WeeklyCalendar, type WeeklyCalendarDay } from '@/shared/ui/schedule/weekly-calendar';
import { Page } from '@/shared/ui/layout/page';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

const BUSINESS_HOURS = Array.from({ length: 10 }, (_, index) => index + 8); // 8..17
const WEEK_SKELETON_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * The Doctor Workspace's Schedule Foundation — a reusable weekly-calendar
 * + daily-timeline architecture backed by the doctor's real (mocked)
 * recurring availability. No appointment/booking logic: every timeline
 * slot is either `available` (inside an availability block) or `blocked`
 * (outside one) — never `booked`, since no Consultation/Appointment
 * module exists yet to produce that data.
 */
export default function DoctorSchedulePage() {
  const t = useTranslations('doctor.schedule');
  const format = useFormatter();
  const { data: availability, isLoading, isError } = useDoctorAvailability();

  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);

  const weekStart = useMemo(() => addWeeks(startOfWeek(today), weekOffset), [today, weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const rangeLabel = `${format.dateTime(weekDays[0], { month: 'short', day: 'numeric' })} – ${format.dateTime(
    weekDays[6],
    { month: 'short', day: 'numeric', year: 'numeric' },
  )}`;

  function availabilityForDay(date: Date) {
    const weekday = getWeekDayName(date);
    return availability?.find((block) => block.dayOfWeek === weekday);
  }

  const calendarDays: WeeklyCalendarDay[] = weekDays.map((date) => {
    const block = availabilityForDay(date);
    return {
      id: date.toISOString(),
      dayLabel: format.dateTime(date, { weekday: 'short' }),
      dateLabel: format.dateTime(date, { day: 'numeric' }),
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate),
      onSelect: () => setSelectedDate(date),
      content: block ? (
        <AvailabilityBlock
          startLabel={format.dateTime(new Date(0, 0, 0, block.startHour), { hour: 'numeric' })}
          endLabel={format.dateTime(new Date(0, 0, 0, block.endHour), { hour: 'numeric' })}
        />
      ) : (
        <p className="text-xs text-text-tertiary">{t('noAvailability')}</p>
      ),
    };
  });

  const selectedDayBlock = availabilityForDay(selectedDate);
  const timelineRows: DailyTimelineRow[] = BUSINESS_HOURS.map((hour) => {
    const isAvailable = selectedDayBlock ? hour >= selectedDayBlock.startHour && hour < selectedDayBlock.endHour : false;
    const hourLabel = format.dateTime(new Date(0, 0, 0, hour), { hour: 'numeric', minute: 'numeric' });
    return {
      id: String(hour),
      hourLabel,
      content: <TimeSlot time={hourLabel} status={isAvailable ? 'available' : 'blocked'} />,
    };
  });

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <CalendarHeader
          label={rangeLabel}
          navigation={
            <DateNavigation
              onPrevious={() => setWeekOffset((value) => value - 1)}
              onNext={() => setWeekOffset((value) => value + 1)}
              onToday={() => {
                setWeekOffset(0);
                setSelectedDate(today);
              }}
              todayLabel={t('today')}
              previousLabel={t('previousWeek')}
              nextLabel={t('nextWeek')}
            />
          }
        />

        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {WEEK_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <WeeklyCalendar days={calendarDays} />
        )}

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-text-primary">
            {format.dateTime(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <DailyTimeline rows={timelineRows} />
        </div>
      </Page>
    </RequireRole>
  );
}
