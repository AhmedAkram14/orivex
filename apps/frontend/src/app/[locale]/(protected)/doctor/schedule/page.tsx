'use client';

import { ArrowRight, CalendarClock, Info, MoreVertical, Plus, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { AppointmentStatus, AppointmentType } from '@/features/doctor/api/types';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import { computeEffectiveWindows } from '@/features/scheduling/utils/effective-window';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { addDays, addWeeks, getWeekDayName, getWeekDays, isSameDay, startOfWeek } from '@/features/doctor/lib/week';
import { addMonths, getMonthGridDays, isSameMonth } from '@/shared/lib/date/month';
import { getDurationMinutes } from '@/shared/lib/date/format-duration';
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
import { Legend } from '@/shared/ui/schedule/legend';
import { LoadingCalendar } from '@/shared/ui/schedule/loading-calendar';
import { MonthCalendar, type MonthCalendarDay } from '@/shared/ui/schedule/month-calendar';
import { TimeGrid, type TimeGridSlot } from '@/shared/ui/schedule/time-grid';
import { WeeklyCalendar, type WeeklyCalendarDay } from '@/shared/ui/schedule/weekly-calendar';
import {
  WeekTimeGrid,
  type WeekTimeGridAccent,
  type WeekTimeGridBackgroundBlock,
  type WeekTimeGridDay,
} from '@/shared/ui/schedule/week-time-grid';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { Badge } from '@/shared/ui/badge';
import { Page } from '@/shared/ui/layout/page';
import { Section } from '@/shared/ui/layout/section';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';
import type { Holiday, RecurringWeeklySchedule, ScheduleException, WorkingHoursDay } from '@/features/scheduling/types';

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
  const tStatusFilterStatuses = useTranslations('doctor.schedule.statusFilter.statuses');
  const tAvailability = useTranslations('scheduling.availability');
  const format = useFormatter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Doctor Reports page rebuild (Phase 2): the reports-tile drill-down's
  // `?status=` URL state -- read once on mount and kept in sync if the URL
  // changes externally (e.g. the doctor drills in again from Reports while
  // already on this page). Preserved across week/month navigation below
  // (that navigation is local `weekOffset`/`monthOffset` state, never
  // touches the URL) since a doctor mid-investigation of one status
  // shouldn't lose the filter just by paging to the next week.
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | undefined>(
    () => (searchParams.get('status') as AppointmentStatus | null) ?? undefined,
  );
  useEffect(() => {
    setStatusFilter((searchParams.get('status') as AppointmentStatus | null) ?? undefined);
  }, [searchParams]);

  function clearStatusFilter() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('status');
    const qs = nextParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setStatusFilter(undefined);
  }
  const { data: schedule, isLoading, isError } = useDoctorAvailability();
  const { data: exceptions, isLoading: isLoadingExceptions } = useDoctorExceptions();
  const { data: holidays } = useHolidays();
  const { data: rules } = useSchedulingRules();

  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEditingHours, setIsEditingHours] = useState(false);
  // Unsaved-changes guard for the Weekly Availability editor's own "×"/
  // overlay/Escape close (its Cancel button guards itself the same way,
  // inside `WorkingHoursForm`) -- `WorkingHoursForm` reports its own RHF
  // `isDirty` up via `onDirtyChange` so this Dialog/Sheet's `onOpenChange`
  // can gate a close-without-saving behind the same confirm.
  const [isHoursFormDirty, setIsHoursFormDirty] = useState(false);
  const [isAddingTimeOff, setIsAddingTimeOff] = useState(false);
  // Desktop keeps working-hours editing inline (plenty of width for it);
  // mobile opens the same form in a bottom Sheet instead, so editing never
  // pushes the whole page's primary schedule content out of view.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Responsive pass (Phase 7): the Week tab's 7-column `WeekTimeGrid` is
  // unreadable at 390px (columns compress far below a legible width) and its
  // own week strip scrolls sideways with "today" often off-screen -- a full
  // grid redesign for narrow viewports is out of scope for this phase (see
  // IMPLEMENTATION_NOTES.md), so instead the default *view* below `md`
  // (768px) is Agenda, a flat list that already reads fine at any width
  // (Phase 4 already fixed its past-slot-first bug). `hasAppliedMobileDefaultRef`
  // makes this a one-time default on first mobile detection only -- a doctor
  // who manually switches to Week on their phone stays there; this never
  // fights that choice on a later render. `useMediaQuery` itself returns
  // `false` during SSR/first paint (documented on the hook) to avoid a
  // hydration mismatch, so the very first frame always matches the desktop
  // default ('week') even on a phone, correcting to 'agenda' a moment later
  // -- the same settle-after-mount tradeoff `isDesktop` above already makes
  // for the working-hours editor.
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const hasAppliedMobileDefaultRef = useRef(false);
  const [scheduleView, setScheduleView] = useState<'week' | 'month' | 'day' | 'agenda' | 'upcoming-slots'>('week');
  useEffect(() => {
    if (isMobileViewport && !hasAppliedMobileDefaultRef.current) {
      hasAppliedMobileDefaultRef.current = true;
      setScheduleView('agenda');
    }
  }, [isMobileViewport]);

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
    const summary = day?.isWorkingDay ? formatEffectiveWindowSummary(day, format, t) : undefined;
    return {
      id: date.toISOString(),
      dayLabel: format.dateTime(date, { weekday: 'short' }),
      dateLabel: format.dateTime(date, { day: 'numeric' }),
      isToday: isSameDay(getCairoNow(date), getCairoNow(today)),
      isSelected: isSameDay(date, selectedDate),
      onSelect: () => setSelectedDate(date),
      content: summary ? (
        <AvailabilityBlock startLabel="" endLabel="" rangeText={summary.primary} label={summary.breakNote} />
      ) : (
        <p className="text-xs text-text-tertiary">{t('noAvailability')}</p>
      ),
    };
  });

  const monthCalendarDays: MonthCalendarDay[] = monthGridDays.map((date) => {
    const day = resolvedDay(date);
    const isPast = getCairoNow(date).getTime() < getCairoNow(today).getTime() && !isSameDay(getCairoNow(date), getCairoNow(today));
    return {
      id: date.toISOString(),
      dateLabel: format.dateTime(date, { day: 'numeric' }),
      isCurrentMonth: isSameMonth(date, monthDate),
      isToday: isSameDay(getCairoNow(date), getCairoNow(today)),
      isPast,
      isSelected: isSameDay(date, selectedDate),
      onSelect: () => setSelectedDate(date),
      // "Not available" is an ordinary schedule state, not an error -- a
      // neutral dot (matching the Working Hours list's own fix below),
      // never the danger/red token.
      content: (
        <span
          className={cn('size-1.5 rounded-full', day?.isWorkingDay ? 'bg-success' : 'bg-neutral')}
          aria-hidden="true"
        />
      ),
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

  // The Week tab's real appointment grid. Doctor Reports page rebuild
  // (Phase 2): threads the `?status=` drill-down filter through.
  const { data: scheduleAppointments, isLoading: isLoadingScheduleAppointments } = useDoctorScheduleAppointments(
    weekStart.toISOString(),
    weekEnd.toISOString(),
    statusFilter,
  );
  const appointmentsThisWeekCount = scheduleAppointments?.length ?? 0;

  const weekGridHourLabels = useMemo(
    () =>
      Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) =>
        format.dateTime(new Date(2026, 0, 1, GRID_START_HOUR + i), { hour: 'numeric' }),
      ),
    [format],
  );

  // Real availability/break bands drawn behind the week grid's appointment
  // blocks (previously the grid body was visually empty apart from booked
  // appointments -- availability only ever showed as a chip in the day
  // header above it). Built from the same `resolveDayForDate` +
  // `computeEffectiveWindows` every other view already uses, clipped to the
  // grid's displayed hour range, so it can never disagree with the week
  // chips or the Weekly Availability summary for the same date.
  function backgroundBlocksForDay(date: Date): WeekTimeGridBackgroundBlock[] {
    const day = resolvedDay(date);
    const gridStartMinutes = GRID_START_HOUR * 60;
    const gridEndMinutes = GRID_END_HOUR * 60;

    if (!day?.isWorkingDay) {
      return [{ id: `${date.toISOString()}-unavailable`, startMinutes: 0, endMinutes: gridEndMinutes - gridStartMinutes, tone: 'unavailable' }];
    }

    const { bookableWindows, breaks } = computeEffectiveWindows(day.hours, day.breaks);
    const toGridBlock = (window: { start: string; end: string }, tone: WeekTimeGridBackgroundBlock['tone'], idSuffix: string) => {
      const startMinutes = Math.max(parseTimeMinutes(window.start), gridStartMinutes) - gridStartMinutes;
      const endMinutes = Math.min(parseTimeMinutes(window.end), gridEndMinutes) - gridStartMinutes;
      return { id: `${date.toISOString()}-${idSuffix}`, startMinutes, endMinutes, tone };
    };

    return [
      ...bookableWindows.map((window, index) => toGridBlock(window, 'available', `available-${index}`)),
      ...breaks.map((brk, index) => toGridBlock(brk, 'break', `break-${index}`)),
    ].filter((block) => block.endMinutes > block.startMinutes);
  }

  const weekGridDays: WeekTimeGridDay[] = weekDays.map((date, dayIndex) => {
    const appointmentsForDay = (scheduleAppointments ?? []).filter((appointment) =>
      isSameDay(getCairoNow(new Date(appointment.scheduledAt)), getCairoNow(date)),
    );

    return {
      id: `${dayIndex}-${date.toISOString()}`,
      backgroundBlocks: schedule ? backgroundBlocksForDay(date) : undefined,
      appointments: appointmentsForDay
        .map((appointment) => {
          const scheduledCairo = getCairoNow(new Date(appointment.scheduledAt));
          const startOfDayMinutes = scheduledCairo.getHours() * 60 + scheduledCairo.getMinutes();
          // Legacy appointments booked before `endTime` existed fall back to
          // the doctor's own configured slot duration purely so the block
          // still renders at a sane height -- never presented as a real
          // recorded end time.
          const durationMinutes = appointment.endTime
            ? Math.max(15, getDurationMinutes(appointment.scheduledAt, appointment.endTime))
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

  // Gates the dialog/sheet's own "×"/overlay/Escape close behind the same
  // unsaved-changes confirm `WorkingHoursForm`'s Cancel button uses --
  // `WorkingHoursForm` already confirms for its own Cancel button and for a
  // real Save (`onSubmit`), so `closeHoursEditor` (used by both) closes
  // directly without a second, redundant confirm.
  function handleHoursEditorOpenChange(nextOpen: boolean) {
    if (!nextOpen && isHoursFormDirty && !window.confirm(tAvailability('unsavedChangesWarning'))) return;
    setIsEditingHours(nextOpen);
    setIsHoursFormDirty(false);
  }

  function closeHoursEditor() {
    setIsEditingHours(false);
    setIsHoursFormDirty(false);
  }

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
              <Tabs value={scheduleView} onValueChange={(value) => setScheduleView(value as typeof scheduleView)}>
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
                      <div className="flex flex-wrap items-center gap-2">
                        {statusFilter && (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="info">
                              {t('statusFilter.filteredBy', { status: tStatusFilterStatuses(statusFilter) })}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={clearStatusFilter}>
                              <Icon icon={X} size="sm" className="me-1" />
                              {t('statusFilter.clear')}
                            </Button>
                          </div>
                        )}
                        <Button size="sm" onClick={() => setIsEditingHours(true)}>
                          <Icon icon={Plus} size="sm" className="me-2" />
                          {t('addAvailability')}
                        </Button>
                      </div>
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
                  <Legend
                    className="mt-3"
                    items={[
                      { id: 'available', label: t('gridLegend.available'), colorClassName: 'bg-success' },
                      { id: 'break', label: t('gridLegend.break'), colorClassName: 'bg-warning' },
                      { id: 'booked', label: t('gridLegend.booked'), colorClassName: 'bg-info' },
                      { id: 'not-available', label: t('gridLegend.notAvailable'), colorClassName: 'bg-neutral' },
                    ]}
                  />
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
                  <Legend
                    className="mt-3"
                    items={[
                      { id: 'available', label: t('monthLegend.available'), colorClassName: 'bg-success' },
                      { id: 'not-available', label: t('monthLegend.notAvailable'), colorClassName: 'bg-neutral' },
                    ]}
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
                      const summary = day.isWorkingDay ? formatEffectiveWindowSummary(day, format, t) : undefined;
                      return (
                      <div
                        key={day.dayOfWeek}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border-default p-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            // "Not available" is an honest, ordinary schedule
                            // state, not an error -- a neutral dot, never the
                            // danger/red token also used for real failures.
                            className={cn('size-2 shrink-0 rounded-full', day.isWorkingDay ? 'bg-success' : 'bg-neutral')}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-text-primary">{dayName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                          {summary ? (
                            <span>
                              {summary.primary}
                              {summary.breakNote && <span className="text-text-tertiary"> · {summary.breakNote}</span>}
                            </span>
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
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">{t('noUpcomingSlots')}</p>
              )}
            </WidgetContainer>

            {/*
             * Booking rules -- item 5 of the Schedule Clarity phase. Real
             * slot length/buffer, read straight from `useSchedulingRules()`
             * (already fetched above for the grid/agenda) rather than a
             * second fetch or a duplicated copy of Settings' own
             * Consultation Defaults form -- that form is the only place
             * `bufferMinutesOverride` is actually editable, so this panel
             * stays read-only and links there instead of re-implementing it.
             */}
            <WidgetContainer
              title={<span className="text-lg font-semibold">{t('bookingRules.title')}</span>}
              className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              loading={!rules}
            >
              {rules && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-text-secondary">{t('bookingRules.description')}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{t('bookingRules.slotLength')}</span>
                    <span className="font-medium text-text-primary">
                      {t('bookingRules.minutesValue', { minutes: rules.slotDurationMinutes })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{t('bookingRules.buffer')}</span>
                    <span className="font-medium text-text-primary">
                      {t('bookingRules.minutesValue', { minutes: rules.bufferMinutes })}
                    </span>
                  </div>
                  <Link
                    href="/doctor/settings#consultation-defaults"
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {t('bookingRules.manageInSettings')}
                    <Icon icon={ArrowRight} size="sm" flipRtl />
                  </Link>
                </div>
              )}
            </WidgetContainer>
          </div>
        </div>

        {schedule &&
          (isDesktop ? (
            <Dialog open={isEditingHours} onOpenChange={handleHoursEditorOpenChange}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('workingHoursTitle')}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <WorkingHoursForm
                    schedule={schedule}
                    onSaved={closeHoursEditor}
                    onCancel={closeHoursEditor}
                    onDirtyChange={setIsHoursFormDirty}
                  />
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Sheet open={isEditingHours} onOpenChange={handleHoursEditorOpenChange}>
              <Sheet.Content>
                <Sheet.Header>
                  <Sheet.Title>{t('workingHoursTitle')}</Sheet.Title>
                </Sheet.Header>
                <div className="mt-4 max-h-[65vh] overflow-y-auto">
                  <WorkingHoursForm
                    schedule={schedule}
                    onSaved={closeHoursEditor}
                    onCancel={closeHoursEditor}
                    onDirtyChange={setIsHoursFormDirty}
                  />
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

/** A "HH:mm" time-of-day, formatted through the real locale-aware formatter via the existing display-only-`Date` idiom -- never a raw string pass-through. */
function formatTimeOfDay(format: ReturnType<typeof useFormatter>, time: string): string {
  return format.dateTime(new Date(0, 0, 0, ...toHm(time)), { hour: 'numeric', minute: 'numeric' });
}

/**
 * The one shared "effective availability" summary for a working day --
 * real bookable sub-windows (via `computeEffectiveWindows`) called out
 * alongside their break(s), instead of the raw full working-hours span a
 * break might not leave fully bookable (the reported Monday bug: "10:00 –
 * 18:00 · 1 break" when the real break runs 13:00–18:00, leaving only
 * 10:00–13:00 actually bookable). Used by both the week chips and the
 * Weekly Availability summary list so they can never disagree.
 */
function formatEffectiveWindowSummary(
  day: WorkingHoursDay,
  format: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations>,
): { primary: string; breakNote?: string } {
  const { bookableWindows, breaks } = computeEffectiveWindows(day.hours, day.breaks);

  const primary =
    bookableWindows.length > 0
      ? bookableWindows
          .map((window) => `${formatTimeOfDay(format, window.start)} – ${formatTimeOfDay(format, window.end)}`)
          .join(', ')
      : t('effectiveWindow.noBookableTime');

  let breakNote: string | undefined;
  if (breaks.length === 1) {
    breakNote = t('effectiveWindow.breakSingle', {
      range: `${formatTimeOfDay(format, breaks[0].start)} – ${formatTimeOfDay(format, breaks[0].end)}`,
    });
  } else if (breaks.length > 1) {
    breakNote = t('breaksCount', { count: breaks.length });
  }

  return { primary, breakNote };
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
