'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ScheduleAgenda } from '@/features/scheduling/components/schedule-agenda';
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
import { AvailabilityCard } from '@/shared/ui/schedule/availability-card';
import { CalendarHeader } from '@/shared/ui/schedule/calendar-header';
import { CalendarSidebar } from '@/shared/ui/schedule/calendar-sidebar';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { EmptyCalendar } from '@/shared/ui/schedule/empty-calendar';
import { LoadingCalendar } from '@/shared/ui/schedule/loading-calendar';
import { MonthCalendar, type MonthCalendarDay } from '@/shared/ui/schedule/month-calendar';
import { TimeGrid, type TimeGridSlot } from '@/shared/ui/schedule/time-grid';
import { WeeklyCalendar, type WeeklyCalendarDay } from '@/shared/ui/schedule/weekly-calendar';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * The Doctor Availability / Appointment Calendar page (Phase 9, Milestones
 * 2–3) — Week/Month/Day/Agenda calendar views over the doctor's real
 * (mocked) recurring weekly schedule, plus the editing architecture Phase
 * 7's read-only Schedule Foundation anticipated: `WorkingHoursForm`
 * (working hours + breaks) and `ScheduleExceptionsManager`
 * (vacation/unavailable dates). The Day view is a real `TimeGrid` of
 * generated slots (with hover detail and a status `Legend`), the Agenda
 * view flattens the same generated slots across the next two weeks — every
 * view resolves through `resolveDayForDate`/`generateDaySlots` so no view
 * ever disagrees with another about the same date.
 */
export default function DoctorSchedulePage() {
  const t = useTranslations('doctor.schedule');
  const tSlotStatus = useTranslations('scheduling.slotStatus');
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
  const daySlots: TimeGridSlot[] = selectedDaySlots.map((slot) => ({
    id: slot.id,
    timeLabel: format.dateTime(new Date(slot.start), { hour: 'numeric', minute: 'numeric' }),
    status: slot.status === 'past' ? 'blocked' : slot.status,
    detail: slot.status === 'available' ? undefined : tSlotStatus(slot.status),
  }));

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading || !schedule ? (
          <LoadingCalendar />
        ) : !schedule.some((day) => day.isWorkingDay) ? (
          <EmptyCalendar title={t('noAvailabilityConfiguredTitle')} description={t('noAvailabilityConfiguredDescription')} />
        ) : (
          <Tabs defaultValue="week">
            <TabsList>
              <TabsTrigger value="week">{t('weekTab')}</TabsTrigger>
              <TabsTrigger value="month">{t('monthTab')}</TabsTrigger>
              <TabsTrigger value="day">{t('dayTab')}</TabsTrigger>
              <TabsTrigger value="agenda">{t('agendaTab')}</TabsTrigger>
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
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex flex-1 flex-col gap-3">
                  <p className="text-sm font-medium text-text-primary">
                    {format.dateTime(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  {daySlots.length > 0 ? (
                    <TimeGrid slots={daySlots} />
                  ) : (
                    <p className="text-sm text-text-tertiary">{t('noAvailability')}</p>
                  )}
                </div>
                {daySlots.length > 0 && (
                  <CalendarSidebar
                    className="md:w-56"
                    legendItems={[
                      { id: 'available', label: tSlotStatus('available'), colorClassName: 'bg-success' },
                      { id: 'booked', label: tSlotStatus('booked'), colorClassName: 'bg-primary' },
                    ]}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="agenda">
              {rules && (
                <ScheduleAgenda schedule={schedule} exceptions={exceptions ?? []} rules={rules} startDate={today} />
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
              <div className="flex flex-col gap-2">
                {schedule.map((day) => (
                  <AvailabilityCard
                    key={day.dayOfWeek}
                    dayLabel={format.dateTime(dayIndexDate(day.dayOfWeek), { weekday: 'long' })}
                    isWorkingDay={day.isWorkingDay}
                    hoursLabel={`${day.hours.start} – ${day.hours.end}`}
                    breaksLabel={day.breaks.length > 0 ? t('breaksCount', { count: day.breaks.length }) : undefined}
                    notWorkingLabel={t('noAvailability')}
                  />
                ))}
              </div>
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
