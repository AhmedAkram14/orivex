'use client';

import { CalendarOff, Download, Lightbulb, RefreshCw, Repeat } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ScheduleAgenda } from '@/features/scheduling/components/schedule-agenda';
import { UpcomingSlotsPanel } from '@/features/scheduling/components/upcoming-slots-panel';
import { WorkingHoursForm } from '@/features/scheduling/components/working-hours-form';
import { ScheduleExceptionsManager } from '@/features/scheduling/components/schedule-exceptions-manager';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { useDoctorExceptions } from '@/features/scheduling/hooks/use-doctor-exceptions';
import { useHolidays } from '@/features/scheduling/hooks/use-holidays';
import { useSchedulingRules } from '@/features/scheduling/hooks/use-scheduling-rules';
import { formatConsultationPrice } from '@/features/scheduling/utils/pricing';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { addWeeks, getWeekDayName, getWeekDays, isSameDay, startOfWeek } from '@/features/doctor/lib/week';
import { addMonths, getMonthGridDays, isSameMonth } from '@/shared/lib/date/month';
import { RequireRole } from '@/shared/auth/require-role';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/side-panel';
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
import { CircularProgress } from '@/shared/ui/charts/circular-progress';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
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
  const locale = useLocale();
  const { data: schedule, isLoading, isError } = useDoctorAvailability();
  const { data: exceptions, isLoading: isLoadingExceptions } = useDoctorExceptions();
  const { data: holidays } = useHolidays();
  const { data: rules } = useSchedulingRules();

  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEditingHours, setIsEditingHours] = useState(false);
  // Desktop keeps working-hours editing inline (plenty of width for it);
  // mobile opens the same form in a bottom Sheet instead, so editing never
  // pushes the whole page's primary schedule content out of view.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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
    return schedule
      ? resolveDayForDate(date, getWeekDayName(date), schedule, exceptions ?? [], holidays ?? [])
      : undefined;
  }

  const timezoneLabel = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, locale, today);

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

  // Weekly Summary widget: how many of the doctor's 7 recurring weekdays
  // are configured as working days -- a real count from `schedule` itself,
  // not a fabricated ratio.
  const workingDaysCount = schedule?.filter((day) => day.isWorkingDay).length ?? 0;

  // Next Available Slot widget: scans forward from today across the next
  // two real weeks (matching ScheduleAgenda's own forward-looking window)
  // and reports the first slot `generateDaySlots` actually marks
  // 'available' -- never a guessed/fabricated time.
  const nextAvailableSlot = useMemo(() => {
    if (!schedule || !rules) return undefined;
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const day = resolveDayForDate(date, getWeekDayName(date), schedule, exceptions ?? [], holidays ?? []);
      if (!day?.isWorkingDay) continue;
      const slot = generateDaySlots(day, rules, date, today).find((candidate) => candidate.status === 'available');
      if (slot) return { date, slot };
    }
    return undefined;
  }, [schedule, rules, exceptions, holidays, today]);

  const timeOffSectionRef = useRef<HTMLDivElement>(null);
  const calendarSectionRef = useRef<HTMLDivElement>(null);

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          description={t('timezoneNote', { timezone: timezoneLabel })}
        />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {isLoading || !schedule ? (
          <LoadingCalendar />
        ) : !schedule.some((day) => day.isWorkingDay) ? (
          <EmptyCalendar title={t('noAvailabilityConfiguredTitle')} description={t('noAvailabilityConfiguredDescription')} />
        ) : (
          <Tabs defaultValue="week" ref={calendarSectionRef}>
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="week">{t('weekTab')}</TabsTrigger>
              <TabsTrigger value="month">{t('monthTab')}</TabsTrigger>
              <TabsTrigger value="day">{t('dayTab')}</TabsTrigger>
              <TabsTrigger value="agenda">{t('agendaTab')}</TabsTrigger>
              <TabsTrigger value="upcoming-slots">{t('upcomingSlotsTab')}</TabsTrigger>
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
                <ScheduleAgenda
                  schedule={schedule}
                  exceptions={exceptions ?? []}
                  holidays={holidays ?? []}
                  rules={rules}
                  startDate={today}
                />
              )}
            </TabsContent>

            <TabsContent value="upcoming-slots">
              <UpcomingSlotsPanel />
            </TabsContent>
          </Tabs>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
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
              {schedule && (
                <>
                  {/* Desktop: editing replaces the read-only list in place (plenty of width for it).
                      Mobile: the read-only list always stays visible; editing opens in the Sheet below instead. */}
                  {isEditingHours && isDesktop ? (
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
                          priceLabel={formatConsultationPrice(
                            {
                              consultationType: day.pricing.pricingType,
                              feeAmount: day.pricing.feeAmount,
                              feeCurrency: day.pricing.feeCurrency,
                            },
                            locale,
                            t('upcomingSlots.free'),
                          )}
                          notWorkingLabel={t('noAvailability')}
                        />
                      ))}
                    </div>
                  )}
                  <Sheet open={isEditingHours && !isDesktop} onOpenChange={setIsEditingHours}>
                    <Sheet.Content>
                      <Sheet.Header>
                        <Sheet.Title>{t('workingHoursTitle')}</Sheet.Title>
                      </Sheet.Header>
                      <div className="mt-4 max-h-[65vh] overflow-y-auto">
                        <WorkingHoursForm schedule={schedule} onSaved={() => setIsEditingHours(false)} />
                      </div>
                    </Sheet.Content>
                  </Sheet>
                </>
              )}
            </Section>

            <div ref={timeOffSectionRef}>
              <Section title={t('timeOffTitle')}>
                {isLoadingExceptions ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <ScheduleExceptionsManager exceptions={exceptions ?? []} />
                )}
              </Section>
            </div>
          </div>

          {/* Tertiary content -- always expanded on desktop (no summary shown there); on mobile it
              starts expanded too but a real collapse control (the summary) lets the doctor tuck
              these four widgets away instead of them permanently competing with the schedule
              itself for scroll space. */}
          <details open className="flex min-w-0 flex-col gap-4">
            <summary className="cursor-pointer list-none rounded-lg border border-border-default bg-surface px-4 py-3 text-sm font-medium text-text-primary marker:hidden lg:hidden">
              {t('scheduleToolsTitle')}
            </summary>
            <WidgetContainer title={t('weeklySummaryTitle')} loading={isLoading}>
              {schedule && (
                <div className="flex flex-col items-center gap-3">
                  <CircularProgress
                    value={workingDaysCount}
                    max={7}
                    label={t('weeklySummaryLabel', { count: workingDaysCount })}
                    size={100}
                  />
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                      {t('weeklySummaryAvailable', { count: workingDaysCount })}
                    </span>
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <span className="size-2 rounded-full bg-secondary-subtle" aria-hidden="true" />
                      {t('weeklySummaryUnavailable', { count: 7 - workingDaysCount })}
                    </span>
                  </div>
                </div>
              )}
            </WidgetContainer>

            <WidgetContainer title={t('nextAvailableSlotTitle')} loading={isLoading}>
              {nextAvailableSlot ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-text-secondary">
                    {format.dateTime(nextAvailableSlot.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-2xl font-semibold text-primary">
                    {format.dateTime(new Date(nextAvailableSlot.slot.start), { hour: 'numeric', minute: 'numeric' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => calendarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="mt-1 text-start text-sm font-medium text-primary hover:underline"
                  >
                    {t('viewFullCalendar')} →
                  </button>
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">{t('noUpcomingSlots')}</p>
              )}
            </WidgetContainer>

            <WidgetContainer title={t('quickActionsTitle')}>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => timeOffSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-start text-sm text-text-primary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <Icon icon={CalendarOff} size="sm" className="text-text-tertiary" />
                  {t('quickActionBlockTimeOff')}
                </button>
                {[
                  { key: 'quickActionRecurringSchedule', icon: Repeat },
                  { key: 'quickActionSyncCalendar', icon: RefreshCw },
                  { key: 'quickActionExportSchedule', icon: Download },
                ].map(({ key, icon }) => (
                  <span
                    key={key}
                    aria-disabled="true"
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-text-tertiary opacity-(--opacity-disabled)"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon={icon} size="sm" />
                      {t(key)}
                    </span>
                    <span className="text-xs">{t('comingSoon')}</span>
                  </span>
                ))}
              </div>
            </WidgetContainer>

            <WidgetContainer contentClassName="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary-emphasis">
                  <Icon icon={Lightbulb} size="md" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{t('tipsTitle')}</p>
                  <p className="text-xs text-text-secondary">{t('tipsDescription')}</p>
                </div>
              </div>
            </WidgetContainer>
          </details>
        </div>
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
