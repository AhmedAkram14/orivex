'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { WorkingHoursForm } from '@/features/scheduling/components/working-hours-form';
import { ScheduleExceptionsManager } from '@/features/scheduling/components/schedule-exceptions-manager';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { useDoctorExceptions } from '@/features/scheduling/hooks/use-doctor-exceptions';
import { useSchedulingRules } from '@/features/scheduling/hooks/use-scheduling-rules';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import { addWeeks, getWeekDayName, getWeekDays, isSameDay, startOfWeek } from '@/features/doctor/lib/week';
import { addMonths, getMonthGridDays, isSameMonth } from '@/shared/lib/date/month';
import { RequireRole } from '@/shared/auth/require-role';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { AvailabilityBlock } from '@/shared/ui/schedule/availability-block';
import { CalendarHeader } from '@/shared/ui/schedule/calendar-header';
import { DailyTimeline, type DailyTimelineRow } from '@/shared/ui/schedule/daily-timeline';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { MonthCalendar, type MonthCalendarDay } from '@/shared/ui/schedule/month-calendar';
import { TimeSlot, type TimeSlotStatus } from '@/shared/ui/schedule/time-slot';
import { WeeklyCalendar, type WeeklyCalendarDay } from '@/shared/ui/schedule/weekly-calendar';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

const WEEK_SKELETON_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const slotStatusMap: Record<string, TimeSlotStatus> = { available: 'available', booked: 'booked', past: 'blocked', blocked: 'blocked' };

/**
 * The Doctor Availability page (Phase 9, Milestone 2) — Week/Month/Day
 * calendar views over the doctor's real (mocked) recurring weekly
 * schedule, plus the editing architecture Phase 7's read-only Schedule
 * Foundation anticipated: `WorkingHoursForm` (working hours + breaks) and
 * `ScheduleExceptionsManager` (vacation/unavailable dates). Every view
 * resolves through `resolveDayForDate` so the recurring template and its
 * exceptions are never computed twice with different logic.
 */
export default function DoctorSchedulePage() {
  const t = useTranslations('doctor.schedule');
  const format = useFormatter();
  const { data: schedule, isLoading, isError } = useDoctorAvailability();
  const { data: exceptions, isLoading: isLoadingExceptions } = useDoctorExceptions();
  const { data: rules } = useSchedulingRules();

  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEditingHours, setIsEditingHours] = useState(false);

  const weekStart = useMemo(() => addWeeks(startOfWeek(today), weekOffset), [today, weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const monthDate = useMemo(() => addMonths(today, monthOffset), [today, monthOffset]);
  const monthGridDays = useMemo(() => getMonthGridDays(monthDate), [monthDate]);

  const weekRangeLabel = `${format.dateTime(weekDays[0], { month: 'short', day: 'numeric' })} – ${format.dateTime(
    weekDays[6],
    { month: 'short', day: 'numeric', year: 'numeric' },
  )}`;
  const monthLabel = format.dateTime(monthDate, { month: 'long', year: 'numeric' });

  function resolvedDay(date: Date) {
    return schedule ? resolveDayForDate(date, getWeekDayName(date), schedule, exceptions ?? []) : undefined;
  }

  const weekCalendarDays: WeeklyCalendarDay[] = weekDays.map((date) => {
    const day = resolvedDay(date);
    return {
      id: date.toISOString(),
      dayLabel: format.dateTime(date, { weekday: 'short' }),
      dateLabel: format.dateTime(date, { day: 'numeric' }),
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate),
      onSelect: () => setSelectedDate(date),
      content: day?.isWorkingDay ? (
        <AvailabilityBlock
          startLabel={format.dateTime(new Date(0, 0, 0, ...toHm(day.hours.start)), { hour: 'numeric' })}
          endLabel={format.dateTime(new Date(0, 0, 0, ...toHm(day.hours.end)), { hour: 'numeric' })}
        />
      ) : (
        <p className="text-xs text-text-tertiary">{t('noAvailability')}</p>
      ),
    };
  });

  const monthCalendarDays: MonthCalendarDay[] = monthGridDays.map((date) => {
    const day = resolvedDay(date);
    return {
      id: date.toISOString(),
      dateLabel: format.dateTime(date, { day: 'numeric' }),
      isCurrentMonth: isSameMonth(date, monthDate),
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate),
      onSelect: () => setSelectedDate(date),
      content: day?.isWorkingDay ? <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> : undefined,
    };
  });

  const selectedDay = resolvedDay(selectedDate);
  const selectedDaySlots =
    selectedDay && rules ? generateDaySlots(selectedDay, rules, selectedDate, today) : [];
  const dayTimelineRows: DailyTimelineRow[] = selectedDaySlots.map((slot) => ({
    id: slot.id,
    hourLabel: format.dateTime(new Date(slot.start), { hour: 'numeric', minute: 'numeric' }),
    content: (
      <TimeSlot
        time={format.dateTime(new Date(slot.start), { hour: 'numeric', minute: 'numeric' })}
        status={slotStatusMap[slot.status]}
      />
    ),
  }));

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading || !schedule ? (
          <div className="grid grid-cols-7 gap-2">
            {WEEK_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="week">
            <TabsList>
              <TabsTrigger value="week">{t('weekTab')}</TabsTrigger>
              <TabsTrigger value="month">{t('monthTab')}</TabsTrigger>
              <TabsTrigger value="day">{t('dayTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="week">
              <CalendarHeader
                label={weekRangeLabel}
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
              <WeeklyCalendar days={weekCalendarDays} todayAnnouncement={t('today')} />
            </TabsContent>

            <TabsContent value="month">
              <CalendarHeader
                label={monthLabel}
                navigation={
                  <DateNavigation
                    onPrevious={() => setMonthOffset((value) => value - 1)}
                    onNext={() => setMonthOffset((value) => value + 1)}
                    onToday={() => {
                      setMonthOffset(0);
                      setSelectedDate(today);
                    }}
                    todayLabel={t('today')}
                    previousLabel={t('previousMonth')}
                    nextLabel={t('nextMonth')}
                  />
                }
              />
              <MonthCalendar
                days={monthCalendarDays}
                weekDayLabels={weekDays.map((date) => format.dateTime(date, { weekday: 'short' }))}
              />
            </TabsContent>

            <TabsContent value="day">
              <p className="pb-3 text-sm font-medium text-text-primary">
                {format.dateTime(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              {dayTimelineRows.length > 0 ? (
                <DailyTimeline rows={dayTimelineRows} />
              ) : (
                <p className="text-sm text-text-tertiary">{t('noAvailability')}</p>
              )}
            </TabsContent>
          </Tabs>
        )}

        <Section
          title={t('workingHoursTitle')}
          actions={
            !isEditingHours && schedule ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditingHours(true)}>
                {t('editWorkingHours')}
              </Button>
            ) : undefined
          }
        >
          {schedule &&
            (isEditingHours ? (
              <WorkingHoursForm schedule={schedule} onSaved={() => setIsEditingHours(false)} />
            ) : (
              <ul className="flex flex-col gap-2">
                {schedule.map((day) => (
                  <li key={day.dayOfWeek} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{format.dateTime(dayIndexDate(day.dayOfWeek), { weekday: 'long' })}</span>
                    <span className="text-text-secondary">
                      {day.isWorkingDay ? `${day.hours.start} – ${day.hours.end}` : t('noAvailability')}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
        </Section>

        <Section title={t('timeOffTitle')}>
          {isLoadingExceptions ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <ScheduleExceptionsManager exceptions={exceptions ?? []} />
          )}
        </Section>
      </Page>
    </RequireRole>
  );
}

/** "09:30" → [9, 30], for building a display-only `Date` via the existing `new Date(0,0,0,hour,minute)` formatting idiom. */
function toHm(time: string): [number, number] {
  const [hours, minutes] = time.split(':').map(Number);
  return [hours, minutes];
}

const WEEKDAY_REFERENCE_DATES: Record<string, Date> = {
  sunday: new Date(2026, 0, 4),
  monday: new Date(2026, 0, 5),
  tuesday: new Date(2026, 0, 6),
  wednesday: new Date(2026, 0, 7),
  thursday: new Date(2026, 0, 8),
  friday: new Date(2026, 0, 9),
  saturday: new Date(2026, 0, 10),
};

/** A stable reference date for each weekday name, purely so `useFormatter().dateTime(..., { weekday: 'long' })` can render a localized weekday name for the read-only working-hours summary without needing a real, current-week date. */
function dayIndexDate(dayOfWeek: string): Date {
  return WEEKDAY_REFERENCE_DATES[dayOfWeek] ?? new Date();
}
