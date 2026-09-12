'use client';

import { ArrowRight, CalendarClock, Info, MoreVertical, Plus } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import { ScheduleAgenda } from '@/features/scheduling/components/schedule-agenda';
import { UpcomingSlotsPanel } from '@/features/scheduling/components/upcoming-slots-panel';
import { WorkingHoursForm } from '@/features/scheduling/components/working-hours-form';
import { ScheduleExceptionForm, ScheduleExceptionsTable } from '@/features/scheduling/components/schedule-exceptions-manager';
import { useDoctorAvailability } from '@/features/scheduling/hooks/use-doctor-availability';
import { useDoctorExceptions } from '@/features/scheduling/hooks/use-doctor-exceptions';
import { useHolidays } from '@/features/scheduling/hooks/use-holidays';
import { useSchedulingRules } from '@/features/scheduling/hooks/use-scheduling-rules';
import { useAvailabilityWindows } from '@/features/scheduling/hooks/use-availability-windows';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { useDoctorScheduleAppointments } from '@/features/doctor/hooks/use-doctor-schedule-appointments';
import type { AppointmentType } from '@/features/doctor/api/types';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { addDays, addWeeks, getWeekDayName, getWeekDays, isSameDay, startOfWeek } from '@/features/doctor/lib/week';
import { addMonths, getMonthGridDays, isSameMonth } from '@/shared/lib/date/month';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { RequireRole } from '@/shared/auth/require-role';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Sheet } from '@/shared/ui/side-panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { AvailabilityBlock } from '@/shared/ui/schedule/availability-block';
import { CalendarHeader } from '@/shared/ui/schedule/calendar-header';
import { CalendarSidebar } from '@/shared/ui/schedule/calendar-sidebar';
import { DateNavigation } from '@/shared/ui/schedule/date-navigation';
import { EmptyCalendar } from '@/shared/ui/schedule/empty-calendar';
import { LoadingCalendar } from '@/shared/ui/schedule/loading-calendar';
import { MonthCalendar, type MonthCalendarDay } from '@/shared/ui/schedule/month-calendar';
import { TimeGrid, type TimeGridSlot } from '@/shared/ui/schedule/time-grid';
import { WeeklyCalendar, type WeeklyCalendarDay } from '@/shared/ui/schedule/weekly-calendar';
import { WeekTimeGrid, type WeekTimeGridAccent, type WeekTimeGridDay } from '@/shared/ui/schedule/week-time-grid';
import { Link } from '@/shared/i18n/navigation';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';
import type { Holiday, RecurringWeeklySchedule, ScheduleException } from '@/features/scheduling/types';

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;

// Mockup-driven redesign: the active tab is a solid brand pill, not the
// shared Tabs primitive's default white-on-gray active state -- scoped to
// this page only (`className` wins over the primitive's own classes via
// tailwind-merge) since Tabs is used on 6+ other pages that keep their
// current look.
const ACTIVE_PILL_TAB = 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none';

const ACCENT_BY_APPOINTMENT_TYPE: Record<AppointmentType, WeekTimeGridAccent> = {
  consultation: 'info',
  follow_up: 'success',
  new_patient: 'danger',
  procedure: 'warning',
};

function parseTimeMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Real hours from the doctor's own recurring schedule, minus real breaks -- never a fabricated ratio. */
function computeAvailableHoursThisWeek(schedule: RecurringWeeklySchedule): number {
  const totalMinutes = schedule.reduce((sum, day) => {
    if (!day.isWorkingDay) return sum;
    const dayMinutes = parseTimeMinutes(day.hours.end) - parseTimeMinutes(day.hours.start);
    const breakMinutes = day.breaks.reduce(
      (breakSum, brk) => breakSum + Math.max(0, parseTimeMinutes(brk.end) - parseTimeMinutes(brk.start)),
      0,
    );
    return sum + Math.max(0, dayMinutes - breakMinutes);
  }, 0);
  return Math.round(totalMinutes / 60);
}

function toIsoDateOnly(date: Date): string {
  const cairo = getCairoNow(date);
  return `${cairo.getFullYear()}-${String(cairo.getMonth() + 1).padStart(2, '0')}-${String(cairo.getDate()).padStart(2, '0')}`;
}

/** Real vacation/unavailable exceptions plus real holidays that fall within the visible week, translated into hours using that weekday's own normal working hours (0 when the day wasn't a working day anyway) -- never a fabricated block duration. */
function computeHoursBlockedThisWeek(
  schedule: RecurringWeeklySchedule,
  exceptions: ScheduleException[],
  holidays: Holiday[],
  weekDays: Date[],
): number {
  const blockedDates = new Set<string>();
  for (const exception of exceptions) {
    if (exception.type === 'vacation' || exception.type === 'unavailable') blockedDates.add(exception.date.slice(0, 10));
  }
  for (const holiday of holidays) blockedDates.add(holiday.date.slice(0, 10));

  let totalMinutes = 0;
  for (const date of weekDays) {
    if (!blockedDates.has(toIsoDateOnly(date))) continue;
    const day = schedule.find((d) => d.dayOfWeek === getWeekDayName(date));
    if (!day || !day.isWorkingDay) continue;
    totalMinutes += Math.max(0, parseTimeMinutes(day.hours.end) - parseTimeMinutes(day.hours.start));
  }
  return Math.round(totalMinutes / 60);
}

/**
 * The Doctor Availability / Appointment Calendar page — Week/Month/Day/
 * Agenda/Upcoming-Slots calendar views over the doctor's real recurring
 * weekly schedule, plus a real hour-positioned weekly grid of the doctor's
 * real booked appointments (`WeekTimeGrid`, fed by `useDoctorScheduleAppointments`)
 * for the Week tab specifically. Working-hours and time-off editing both
 * moved from always-inline to a real `Dialog` flow, matching the mockup's
 * card + "+ Add ..." CTA pattern rather than replacing the read-only list in
 * place. Every view resolves through `resolveDayForDate`/`generateDaySlots`
 * so no view ever disagrees with another about the same date.
 */
export default function DoctorSchedulePage() {
  const t = useTranslations('doctor.schedule');
  const tAppointmentType = useTranslations('doctor.schedule.appointmentType');
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
  const [isAddingTimeOff, setIsAddingTimeOff] = useState(false);
  // Desktop keeps working-hours editing inline (plenty of width for it);
  // mobile opens the same form in a bottom Sheet instead, so editing never
  // pushes the whole page's primary schedule content out of view.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const weekStart = useMemo(() => addWeeks(startOfWeek(today), weekOffset), [today, weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
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
      isToday: isSameDay(getCairoNow(date), getCairoNow(today)),
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
      isToday: isSameDay(getCairoNow(date), getCairoNow(today)),
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

  // "This Week" sidebar stats.
  const workingDaysCount = schedule?.filter((day) => day.isWorkingDay).length ?? 0;
  const availableHoursThisWeek = schedule ? computeAvailableHoursThisWeek(schedule) : 0;
  const hoursBlockedThisWeek =
    schedule && exceptions ? computeHoursBlockedThisWeek(schedule, exceptions, holidays ?? [], weekDays) : 0;

  // The Week tab's real appointment grid.
  const { data: scheduleAppointments, isLoading: isLoadingScheduleAppointments } = useDoctorScheduleAppointments(
    weekStart.toISOString(),
    weekEnd.toISOString(),
  );
  const appointmentsThisWeekCount = scheduleAppointments?.length ?? 0;

  const weekGridHourLabels = useMemo(
    () =>
      Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) =>
        format.dateTime(new Date(2026, 0, 1, GRID_START_HOUR + i), { hour: 'numeric' }),
      ),
    [format],
  );

  const weekGridDays: WeekTimeGridDay[] = weekDays.map((date, dayIndex) => {
    const appointmentsForDay = (scheduleAppointments ?? []).filter((appointment) =>
      isSameDay(getCairoNow(new Date(appointment.scheduledAt)), getCairoNow(date)),
    );

    return {
      id: `${dayIndex}-${date.toISOString()}`,
      appointments: appointmentsForDay
        .map((appointment) => {
          const scheduledCairo = getCairoNow(new Date(appointment.scheduledAt));
          const startOfDayMinutes = scheduledCairo.getHours() * 60 + scheduledCairo.getMinutes();
          // Legacy appointments booked before `endTime` existed fall back to
          // the doctor's own configured slot duration purely so the block
          // still renders at a sane height -- never presented as a real
          // recorded end time.
          const durationMinutes = appointment.endTime
            ? Math.max(
                15,
                Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.scheduledAt).getTime()) / 60000),
              )
            : (rules?.slotDurationMinutes ?? 30);
          return {
            id: appointment.id,
            startMinutes: startOfDayMinutes - GRID_START_HOUR * 60,
            endMinutes: startOfDayMinutes - GRID_START_HOUR * 60 + durationMinutes,
            primaryLabel: appointment.patientName,
            secondaryLabel: appointment.appointmentType ? tAppointmentType(appointment.appointmentType) : undefined,
            timeLabel: format.dateTime(new Date(appointment.scheduledAt), { hour: 'numeric', minute: 'numeric' }),
            accent: appointment.appointmentType ? ACCENT_BY_APPOINTMENT_TYPE[appointment.appointmentType] : 'neutral',
          };
        })
        // Appointments outside the grid's displayed hour range are omitted
        // rather than rendered clipped/overlapping the gutter -- a real but
        // rare edge case (working hours here run inside 8AM-8PM today).
        .filter((appointment) => appointment.startMinutes >= 0 && appointment.endMinutes <= (GRID_END_HOUR - GRID_START_HOUR) * 60),
    };
  });

  // Next Available Slot widget: the same authoritative, backend-materialized
  // `AvailabilityWindow`s a patient would see for this doctor (real
  // GetBookableAvailabilityUseCase data -- already excludes booked/held
  // windows and applies minNoticeMinutes) rather than a local client-side
  // simulation that had no idea which slots were actually still free.
  const { data: doctorProfile } = useDoctorProfile();
  const availabilityRangeEnd = useMemo(() => new Date(today.getTime() + 14 * 24 * 60 * 60_000), [today]);
  const { data: bookableWindows, isLoading: isLoadingBookableWindows } = useAvailabilityWindows(
    doctorProfile?.id,
    today.toISOString(),
    availabilityRangeEnd.toISOString(),
  );
  const nextAvailableSlot = useMemo(() => {
    if (!bookableWindows || bookableWindows.length === 0) return undefined;
    return [...bookableWindows].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )[0];
  }, [bookableWindows]);

  const calendarSectionRef = useRef<HTMLDivElement>(null);

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader breadcrumbs={<AppBreadcrumbs />} title={t('title')} description={t('subtitle')} />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            {isLoading || !schedule ? (
              <LoadingCalendar />
            ) : !schedule.some((day) => day.isWorkingDay) ? (
              <EmptyCalendar title={t('noAvailabilityConfiguredTitle')} description={t('noAvailabilityConfiguredDescription')} />
            ) : (
              <Tabs defaultValue="week" ref={calendarSectionRef}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList className="max-w-full overflow-x-auto">
                    <TabsTrigger value="week" className={ACTIVE_PILL_TAB}>{t('weekTab')}</TabsTrigger>
                    <TabsTrigger value="month" className={ACTIVE_PILL_TAB}>{t('monthTab')}</TabsTrigger>
                    <TabsTrigger value="day" className={ACTIVE_PILL_TAB}>{t('dayTab')}</TabsTrigger>
                    <TabsTrigger value="agenda" className={ACTIVE_PILL_TAB}>{t('agendaTab')}</TabsTrigger>
                    <TabsTrigger value="upcoming-slots" className={ACTIVE_PILL_TAB}>{t('upcomingSlotsTab')}</TabsTrigger>
                  </TabsList>
                  <span className="flex items-center gap-1.5 text-sm text-text-tertiary">
                    <Icon icon={Info} size="sm" />
                    {t('timezoneNote', { timezone: timezoneLabel })}
                  </span>
                </div>

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
                    actions={
                      <Button size="sm" onClick={() => setIsEditingHours(true)}>
                        <Icon icon={Plus} size="sm" className="me-2" />
                        {t('addAvailability')}
                      </Button>
                    }
                  />
                  <WeeklyCalendar days={weekCalendarDays} todayAnnouncement={t('today')} />
                  <div className="mt-4 overflow-x-auto rounded-lg border border-border-default p-4">
                    {isLoadingScheduleAppointments ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <WeekTimeGrid days={weekGridDays} hourLabels={weekGridHourLabels} className="min-w-[640px]" />
                    )}
                  </div>
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Section
                title={t('workingHoursTitle')}
                description={t('workingHoursDescription')}
                actions={
                  schedule ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingHours(true)}>
                      {t('editWorkingHours')}
                    </Button>
                  ) : undefined
                }
              >
                {schedule && (
                  <div className="flex flex-col gap-2">
                    {schedule.map((day) => {
                      const dayName = format.dateTime(dayIndexDate(day.dayOfWeek), { weekday: 'long' });
                      return (
                      <div
                        key={day.dayOfWeek}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn('size-2 shrink-0 rounded-full', day.isWorkingDay ? 'bg-success' : 'bg-danger')}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-text-primary">{dayName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                          {day.isWorkingDay ? (
                            <>
                              <span>{`${day.hours.start} – ${day.hours.end}`}</span>
                              <span className="text-text-tertiary">
                                {day.breaks.length > 0 ? t('breaksCount', { count: day.breaks.length }) : '—'}
                              </span>
                            </>
                          ) : (
                            <span className="text-text-tertiary">{t('noAvailability')}</span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={t('rowActionsFor', { day: dayName })}
                                className="inline-flex size-8 items-center justify-center rounded-md text-text-tertiary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle hover:text-text-secondary"
                              >
                                <Icon icon={MoreVertical} size="sm" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setIsEditingHours(true)}>{t('editRowHours')}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </Section>

              <Section
                title={t('timeOffTitle')}
                description={t('timeOffDescription')}
                actions={
                  <Button size="sm" onClick={() => setIsAddingTimeOff(true)}>
                    <Icon icon={Plus} size="sm" className="me-2" />
                    {t('addTimeOff')}
                  </Button>
                }
              >
                {isLoadingExceptions ? <Skeleton className="h-16 w-full" /> : <ScheduleExceptionsTable exceptions={exceptions ?? []} />}
              </Section>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Card className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-text-primary">{t('thisWeek.title')}</p>
                  <Link href="/doctor/reports" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    {t('thisWeek.viewReports')}
                    <Icon icon={ArrowRight} size="sm" flipRtl />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ThisWeekStat accent="success" label={t('thisWeek.workingDays')} value={String(workingDaysCount)} loading={isLoading} />
                  <ThisWeekStat accent="info" label={t('thisWeek.availableHours')} value={String(availableHoursThisWeek)} loading={isLoading} />
                  <ThisWeekStat
                    accent="primary"
                    label={t('thisWeek.appointments')}
                    value={String(appointmentsThisWeekCount)}
                    loading={isLoadingScheduleAppointments}
                  />
                  <ThisWeekStat
                    accent="warning"
                    label={t('thisWeek.hoursBlocked')}
                    value={String(hoursBlockedThisWeek)}
                    loading={isLoading || isLoadingExceptions}
                  />
                </div>
              </CardContent>
            </Card>

            <WidgetContainer
              title={<span className="text-lg font-semibold">{t('nextAvailableSlotTitle')}</span>}
              className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              loading={isLoading || isLoadingBookableWindows}
            >
              {nextAvailableSlot ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-subtle text-info-emphasis">
                      <Icon icon={CalendarClock} size="md" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm text-text-secondary">
                        {format.dateTime(new Date(nextAvailableSlot.startTime), { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xl font-semibold text-text-primary">
                        {format.dateTime(new Date(nextAvailableSlot.startTime), { hour: 'numeric', minute: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => calendarSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    {t('viewFullCalendar')}
                    <Icon icon={ArrowRight} size="sm" className="ms-2" flipRtl />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">{t('noUpcomingSlots')}</p>
              )}
            </WidgetContainer>
          </div>
        </div>

        {schedule &&
          (isDesktop ? (
            <Dialog open={isEditingHours} onOpenChange={setIsEditingHours}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('workingHoursTitle')}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <WorkingHoursForm schedule={schedule} onSaved={() => setIsEditingHours(false)} />
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Sheet open={isEditingHours} onOpenChange={setIsEditingHours}>
              <Sheet.Content>
                <Sheet.Header>
                  <Sheet.Title>{t('workingHoursTitle')}</Sheet.Title>
                </Sheet.Header>
                <div className="mt-4 max-h-[65vh] overflow-y-auto">
                  <WorkingHoursForm schedule={schedule} onSaved={() => setIsEditingHours(false)} />
                </div>
              </Sheet.Content>
            </Sheet>
          ))}

        <Dialog open={isAddingTimeOff} onOpenChange={setIsAddingTimeOff}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addTimeOff')}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <ScheduleExceptionForm onAdded={() => setIsAddingTimeOff(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </Page>
    </RequireRole>
  );
}

interface ThisWeekStatProps {
  accent: 'success' | 'info' | 'primary' | 'warning';
  label: string;
  value: string;
  loading?: boolean;
}

const THIS_WEEK_ACCENT_CLASSES: Record<ThisWeekStatProps['accent'], string> = {
  success: 'bg-success-subtle text-success-emphasis',
  info: 'bg-info-subtle text-info-emphasis',
  primary: 'bg-primary-subtle text-primary-emphasis',
  warning: 'bg-warning-subtle text-warning-emphasis',
};

function ThisWeekStat({ accent, label, value, loading }: ThisWeekStatProps) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-xl p-3', THIS_WEEK_ACCENT_CLASSES[accent])}>
      {loading ? <Skeleton className="h-6 w-10" /> : <span className="text-xl font-semibold text-text-primary">{value}</span>}
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
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
