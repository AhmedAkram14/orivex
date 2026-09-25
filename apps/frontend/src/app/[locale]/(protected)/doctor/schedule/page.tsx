'use client';

import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Info, MoreVertical, Plus, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import {
  DoctorScheduleCalendar,
  type CalendarAccent,
  type CalendarAppointment,
  type DayAvailability,
  type ScheduleCalendarHandle,
  type ScheduleCalendarView,
  type VisibleRange,
} from '@/features/scheduling/components/doctor-schedule-calendar';
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
import { computeEffectiveWindows } from '@/features/scheduling/utils/effective-window';
import { DEFAULT_TIME_ZONE, getTimezoneOffsetLabel } from '@/features/scheduling/utils/timezone';
import { addDays, addWeeks, getWeekDayName, getWeekDays, isSameDay, startOfWeek } from '@/features/doctor/lib/week';
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
import { EmptyCalendar } from '@/shared/ui/schedule/empty-calendar';
import { Legend } from '@/shared/ui/schedule/legend';
import { LoadingCalendar } from '@/shared/ui/schedule/loading-calendar';
import { Link, usePathname, useRouter } from '@/shared/i18n/navigation';
import { Badge } from '@/shared/ui/badge';
import { Page } from '@/shared/ui/layout/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';
import { cn } from '@/shared/lib/cn';
import type { Holiday, RecurringWeeklySchedule, ScheduleException, WorkingHoursDay } from '@/features/scheduling/types';

type ScheduleViewTab = ScheduleCalendarView | 'agenda' | 'upcoming-slots';

const CALENDAR_VIEWS: ScheduleViewTab[] = ['week', 'month', 'day'];

// The active tab is a solid brand pill (scoped to this page: `className` wins
// over the shared Tabs primitive via tailwind-merge, so the other pages that
// use Tabs keep their look).
const ACTIVE_PILL_TAB = 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none';

const ACCENT_BY_APPOINTMENT_TYPE: Record<AppointmentType, CalendarAccent> = {
  consultation: 'info',
  follow_up: 'success',
  new_patient: 'danger',
  procedure: 'warning',
};

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** A calendar day (local fields) re-encoded as UTC, so `format.dateTime(..., { timeZone: 'UTC' })` prints that exact day regardless of the browser's timezone. */
function asUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * The Doctor Schedule: one scheduling workspace built around a real
 * FullCalendar time grid (Week/Month/Day) over the doctor's real recurring
 * schedule, exceptions, holidays and booked appointments. The slot Agenda
 * and Upcoming-Slots tabs keep their existing panels. Working-hours and
 * time-off editing stay in the existing dialogs/forms. Every view resolves
 * availability through `resolveDayForDate`/`computeEffectiveWindows`, so no
 * view disagrees with another about the same date.
 */
export default function DoctorSchedulePage() {
  const t = useTranslations('doctor.schedule');
  const tAppointmentType = useTranslations('doctor.schedule.appointmentType');
  const tStatusFilterStatuses = useTranslations('doctor.schedule.statusFilter.statuses');
  const tAvailability = useTranslations('scheduling.availability');
  const format = useFormatter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const calendarRef = useRef<ScheduleCalendarHandle>(null);

  // Doctor Reports drill-down: `?status=` -- read on mount and kept in sync
  // if the URL changes externally, preserved while paging the calendar.
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
  const [scheduleView, setScheduleView] = useState<ScheduleViewTab>('week');
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  // The day the Day view opens on (a month-cell click, or the last selected slot's day).
  const [pendingGotoDate, setPendingGotoDate] = useState<Date | null>(null);
  // A time slot picked in the Week/Day grid (Cairo wall-clock encoded as UTC).
  const [selection, setSelection] = useState<{ start: Date; end: Date } | null>(null);
  const [isEditingHours, setIsEditingHours] = useState(false);
  // Unsaved-changes guard for the working-hours editor's own close paths.
  const [isHoursFormDirty, setIsHoursFormDirty] = useState(false);
  const [isAddingTimeOff, setIsAddingTimeOff] = useState(false);
  const [timeOffDate, setTimeOffDate] = useState<string | undefined>(undefined);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Below `md` the default view is Day (a single column that reads at any
  // width); a one-time default so a doctor's manual switch is never fought.
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const hasAppliedMobileDefaultRef = useRef(false);
  useEffect(() => {
    if (isMobileViewport && !hasAppliedMobileDefaultRef.current) {
      hasAppliedMobileDefaultRef.current = true;
      setScheduleView('day');
    }
  }, [isMobileViewport]);

  const isCalendarView = CALENDAR_VIEWS.includes(scheduleView);
  const calendarView: ScheduleCalendarView = isCalendarView ? (scheduleView as ScheduleCalendarView) : 'week';

  const timezoneLabel = getTimezoneOffsetLabel(DEFAULT_TIME_ZONE, locale, today);

  // Real availability for one calendar day, in the shape the calendar draws.
  const getDayAvailability = useCallback(
    (date: Date): DayAvailability | undefined => {
      const day = schedule
        ? resolveDayForDate(date, getWeekDayName(date), schedule, exceptions ?? [], holidays ?? [])
        : undefined;
      if (!day) return undefined;
      if (!day.isWorkingDay) return { isWorkingDay: false, bookable: [], breaks: [], summary: t('noAvailability') };
      const { bookableWindows, breaks } = computeEffectiveWindows(day.hours, day.breaks);
      // Compact for the narrow day-header chip ("9 AM – 1 PM"); the fuller
      // minutes form stays in the Weekly Availability list.
      const compact = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return format.dateTime(new Date(0, 0, 0, hours, minutes), minutes === 0 ? { hour: 'numeric' } : { hour: 'numeric', minute: 'numeric' });
      };
      const summary =
        bookableWindows.length > 0
          ? bookableWindows.map((window) => `${compact(window.start)} – ${compact(window.end)}`).join(', ')
          : t('effectiveWindow.noBookableTime');
      return { isWorkingDay: true, bookable: bookableWindows, breaks, summary };
    },
    [schedule, exceptions, holidays, format, t],
  );

  // The week the sidebar stats describe: the visible week in Week view,
  // otherwise the current week.
  const statsWeekStart = useMemo(
    () => (scheduleView === 'week' && visibleRange ? visibleRange.start : startOfWeek(today)),
    [scheduleView, visibleRange, today],
  );
  const statsWeekDays = useMemo(() => getWeekDays(statsWeekStart), [statsWeekStart]);

  // Appointments for the calendar's visible range (padded by a day each side
  // so a Cairo/UTC boundary never drops an edge appointment) or the stats
  // week when a non-calendar tab is open.
  const fetchStart = useMemo(() => addDays(visibleRange && isCalendarView ? visibleRange.start : startOfWeek(today), -1), [visibleRange, isCalendarView, today]);
  const fetchEnd = useMemo(
    () => addDays(visibleRange && isCalendarView ? visibleRange.end : addWeeks(startOfWeek(today), 1), 1),
    [visibleRange, isCalendarView, today],
  );
  const { data: scheduleAppointments, isLoading: isLoadingScheduleAppointments } = useDoctorScheduleAppointments(
    fetchStart.toISOString(),
    fetchEnd.toISOString(),
    statusFilter,
  );

  const calendarAppointments = useMemo<CalendarAppointment[]>(
    () =>
      (scheduleAppointments ?? []).map((appointment) => {
        const start = new Date(appointment.scheduledAt);
        // Legacy appointments booked before `endTime` existed fall back to the
        // doctor's slot duration purely so the block renders at a sane height
        // -- never presented as a recorded end time.
        const durationMinutes = appointment.endTime
          ? Math.max(15, getDurationMinutes(appointment.scheduledAt, appointment.endTime))
          : (rules?.slotDurationMinutes ?? 30);
        return {
          id: appointment.id,
          start,
          end: new Date(start.getTime() + durationMinutes * 60_000),
          patientName: appointment.patientName,
          timeLabel: format.dateTime(start, { hour: 'numeric', minute: 'numeric' }),
          typeLabel: appointment.appointmentType ? tAppointmentType(appointment.appointmentType) : undefined,
          accent: appointment.appointmentType ? ACCENT_BY_APPOINTMENT_TYPE[appointment.appointmentType] : 'neutral',
        };
      }),
    [scheduleAppointments, rules, format, tAppointmentType],
  );

  // "This Week" sidebar stats.
  const workingDaysCount = schedule?.filter((day) => day.isWorkingDay).length ?? 0;
  const availableHoursThisWeek = schedule ? computeAvailableHoursThisWeek(schedule) : 0;
  const hoursBlockedThisWeek =
    schedule && exceptions ? computeHoursBlockedThisWeek(schedule, exceptions, holidays ?? [], statsWeekDays) : 0;
  const appointmentsThisWeekCount = (scheduleAppointments ?? []).filter((appointment) =>
    statsWeekDays.some((day) => isSameDay(getCairoNow(new Date(appointment.scheduledAt)), getCairoNow(day))),
  ).length;

  // Next Available Slot: the same backend-materialized windows a patient sees.
  const { data: doctorProfile } = useDoctorProfile();
  const availabilityRangeEnd = useMemo(() => new Date(today.getTime() + 14 * DAY_MS), [today]);
  const { data: bookableWindows, isLoading: isLoadingBookableWindows } = useAvailabilityWindows(
    doctorProfile?.id,
    today.toISOString(),
    availabilityRangeEnd.toISOString(),
  );
  const nextAvailableSlot = useMemo(() => {
    if (!bookableWindows || bookableWindows.length === 0) return undefined;
    return [...bookableWindows].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [bookableWindows]);

  // ---- Toolbar -------------------------------------------------------
  const rangeLabel = useMemo(() => {
    if (!visibleRange || !isCalendarView) return '';
    const start = asUtcDay(visibleRange.start);
    if (calendarView === 'month') {
      return format.dateTime(asUtcDay(visibleRange.currentStart), { month: 'long', year: 'numeric', timeZone: 'UTC' });
    }
    if (calendarView === 'day') {
      return format.dateTime(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    const last = asUtcDay(addDays(visibleRange.end, -1));
    return `${format.dateTime(start, { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${format.dateTime(last, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })}`;
  }, [visibleRange, isCalendarView, calendarView, format]);

  const previousLabel = calendarView === 'month' ? t('previousMonth') : calendarView === 'day' ? t('previousDay') : t('previousWeek');
  const nextLabel = calendarView === 'month' ? t('nextMonth') : calendarView === 'day' ? t('nextDay') : t('nextWeek');

  function handleViewChange(value: string) {
    const next = value as ScheduleViewTab;
    // Moving into Day view lands on the selected slot's day (or today when
    // today is in the current range), rather than the range's first day.
    if (next === 'day' && scheduleView !== 'day') {
      const anchor = selection
        ? new Date(selection.start.getUTCFullYear(), selection.start.getUTCMonth(), selection.start.getUTCDate())
        : visibleRange && getCairoNow(today) >= visibleRange.start && getCairoNow(today) < visibleRange.end
          ? getCairoNow(today)
          : (visibleRange?.start ?? getCairoNow(today));
      setPendingGotoDate(anchor);
    }
    setScheduleView(next);
  }

  // Applied after the view (and thus the calendar) has switched.
  useEffect(() => {
    if (pendingGotoDate && scheduleView === 'day') {
      calendarRef.current?.goto(pendingGotoDate);
      setPendingGotoDate(null);
    }
  }, [pendingGotoDate, scheduleView]);

  function handleToday() {
    calendarRef.current?.today();
    setSelection(null);
  }

  function handleDayClick(day: Date) {
    setPendingGotoDate(new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    setScheduleView('day');
  }

  // What the selected slot means, from real availability -- so the doctor can
  // see whether the slot they clicked is bookable before acting on it.
  const selectionStatus = useMemo(() => {
    if (!selection) return undefined;
    const availability = getDayAvailability(new Date(selection.start.getUTCFullYear(), selection.start.getUTCMonth(), selection.start.getUTCDate()));
    if (!availability) return undefined;
    if (!availability.isWorkingDay) return 'notWorkingDay' as const;
    const startMinutes = selection.start.getUTCHours() * 60 + selection.start.getUTCMinutes();
    if (availability.breaks.some((brk) => startMinutes >= parseTimeMinutes(brk.start) && startMinutes < parseTimeMinutes(brk.end))) return 'break' as const;
    if (availability.bookable.some((window) => startMinutes >= parseTimeMinutes(window.start) && startMinutes < parseTimeMinutes(window.end))) {
      return 'available' as const;
    }
    return 'outsideHours' as const;
  }, [selection, getDayAvailability]);

  function openTimeOffForSelection() {
    if (selection) {
      const d = selection.start;
      setTimeOffDate(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    } else {
      setTimeOffDate(undefined);
    }
    setIsAddingTimeOff(true);
  }

  function handleHoursEditorOpenChange(nextOpen: boolean) {
    if (!nextOpen && isHoursFormDirty && !window.confirm(tAvailability('unsavedChangesWarning'))) return;
    setIsEditingHours(nextOpen);
    setIsHoursFormDirty(false);
  }

  function closeHoursEditor() {
    setIsEditingHours(false);
    setIsHoursFormDirty(false);
  }

  const hasNoWorkingDays = !!schedule && !schedule.some((day) => day.isWorkingDay);

  return (
    <RequireRole roles={['doctor']} redirectTo="/forbidden">
      <Page>
        <WorkspaceHeader
          breadcrumbs={<AppBreadcrumbs />}
          title={t('title')}
          description={t('subtitle')}
          actions={
            <span className="flex items-center gap-1.5 text-sm text-text-tertiary">
              <Icon icon={Info} size="sm" />
              {t('timezoneNote', { timezone: timezoneLabel })}
            </span>
          }
        />

        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {/* One Tabs root wraps the toolbar's tab list AND the panel it controls, so every tab's aria-controls points at a real element. */}
        <Tabs value={scheduleView} onValueChange={handleViewChange} className="flex flex-col gap-6">
        {/* Toolbar: view tabs on the left, navigation + primary action on the right. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="week" className={ACTIVE_PILL_TAB}>{t('weekTab')}</TabsTrigger>
              <TabsTrigger value="month" className={ACTIVE_PILL_TAB}>{t('monthTab')}</TabsTrigger>
              <TabsTrigger value="day" className={ACTIVE_PILL_TAB}>{t('dayTab')}</TabsTrigger>
              <TabsTrigger value="agenda" className={ACTIVE_PILL_TAB}>{t('agendaTab')}</TabsTrigger>
              <TabsTrigger value="upcoming-slots" className={ACTIVE_PILL_TAB}>{t('upcomingSlotsTab')}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCalendarView && !!schedule && !hasNoWorkingDays && (
              <>
                <div className="flex items-center rounded-lg border border-border-default bg-surface">
                  <button
                    type="button"
                    aria-label={previousLabel}
                    onClick={() => calendarRef.current?.prev()}
                    className="inline-flex size-9 items-center justify-center rounded-s-lg text-text-secondary transition-colors hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <Icon icon={ChevronLeft} size="sm" flipRtl />
                  </button>
                  <span className="min-w-36 px-3 text-center text-sm font-medium text-text-primary" aria-live="polite">
                    {rangeLabel}
                  </span>
                  <button
                    type="button"
                    aria-label={nextLabel}
                    onClick={() => calendarRef.current?.next()}
                    className="inline-flex size-9 items-center justify-center rounded-e-lg text-text-secondary transition-colors hover:bg-secondary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <Icon icon={ChevronRight} size="sm" flipRtl />
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  {t('today')}
                </Button>
              </>
            )}
            {statusFilter && (
              <div className="flex items-center gap-1.5">
                <Badge variant="info">{t('statusFilter.filteredBy', { status: tStatusFilterStatuses(statusFilter) })}</Badge>
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
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_18.5rem]">
          {/* The calendar dominates: it takes the whole main column. */}
          <TabsContent value={scheduleView} className="mt-0 flex min-w-0 flex-col gap-3">
            {isLoading || !schedule ? (
              <LoadingCalendar />
            ) : hasNoWorkingDays ? (
              <EmptyCalendar title={t('noAvailabilityConfiguredTitle')} description={t('noAvailabilityConfiguredDescription')} />
            ) : isCalendarView ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-border-default bg-surface">
                  {isLoadingScheduleAppointments && <Skeleton className="h-1 w-full rounded-none" />}
                  <div className={cn(calendarView === 'month' ? 'min-w-[560px]' : calendarView === 'week' ? 'min-w-[720px]' : undefined)}>
                    <DoctorScheduleCalendar
                      ref={calendarRef}
                      view={calendarView}
                      initialDate={pendingGotoDate ?? visibleRange?.currentStart ?? getCairoNow(today)}
                      locale={locale}
                      appointments={calendarAppointments}
                      getDayAvailability={getDayAvailability}
                      onRangeChange={setVisibleRange}
                      onAppointmentClick={(id) => router.push(`/doctor/appointments?highlight=${id}`)}
                      onSlotSelect={setSelection}
                      onDayClick={handleDayClick}
                      labels={{
                        moreLinkText: (count) => t('calendar.moreLink', { count }),
                        appointmentAria: (patient, time) => t('calendar.appointmentAria', { patient, time }),
                      }}
                    />
                  </div>
                </div>

                {selection && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary-subtle px-3 py-2 text-sm"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 text-text-primary">
                      <span className="font-medium">
                        {format.dateTime(selection.start, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })} ·{' '}
                        {format.dateTime(selection.start, { hour: 'numeric', minute: 'numeric', timeZone: 'UTC' })} –{' '}
                        {format.dateTime(selection.end, { hour: 'numeric', minute: 'numeric', timeZone: 'UTC' })}
                      </span>
                      {selectionStatus && <span className="text-text-secondary">{t(`calendar.selection.${selectionStatus}`)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setIsEditingHours(true)}>
                        {t('editWorkingHours')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={openTimeOffForSelection}>
                        {t('calendar.selection.addTimeOff')}
                      </Button>
                      <button
                        type="button"
                        aria-label={t('calendar.selection.clear')}
                        onClick={() => setSelection(null)}
                        className="inline-flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        <Icon icon={X} size="sm" />
                      </button>
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <Legend
                    items={[
                      { id: 'available', label: t('gridLegend.available'), colorClassName: 'bg-success' },
                      { id: 'break', label: t('gridLegend.break'), colorClassName: 'bg-warning' },
                      { id: 'booked', label: t('gridLegend.booked'), colorClassName: 'bg-info' },
                      { id: 'not-available', label: t('gridLegend.notAvailable'), colorClassName: 'bg-neutral' },
                    ]}
                  />
                  {rules && (
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-tertiary">
                      <span>{t('bookingRules.slotLength')}: {t('bookingRules.minutesValue', { minutes: rules.slotDurationMinutes })}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t('bookingRules.buffer')}: {t('bookingRules.minutesValue', { minutes: rules.bufferMinutes })}</span>
                      <Link href="/doctor/settings#consultation-defaults" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                        {t('bookingRules.manageInSettings')}
                        <Icon icon={ArrowRight} size="xs" flipRtl />
                      </Link>
                    </p>
                  )}
                </div>
              </>
            ) : scheduleView === 'agenda' ? (
              rules && <ScheduleAgenda schedule={schedule} exceptions={exceptions ?? []} holidays={holidays ?? []} rules={rules} startDate={today} />
            ) : (
              <UpcomingSlotsPanel />
            )}
          </TabsContent>

          {/* Compact summary column: two cards only. */}
          <div className="grid min-w-0 grid-cols-1 content-start gap-4 md:grid-cols-2 2xl:grid-cols-1">
            <Card className="rounded-xl border-border-default shadow-none">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-text-primary">{t('thisWeek.title')}</h2>
                  <Link href="/doctor/reports" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    {t('thisWeek.viewReports')}
                    <Icon icon={ArrowRight} size="xs" flipRtl />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ThisWeekStat accent="success" label={t('thisWeek.workingDays')} value={String(workingDaysCount)} loading={isLoading} />
                  <ThisWeekStat accent="info" label={t('thisWeek.availableHours')} value={String(availableHoursThisWeek)} loading={isLoading} />
                  <ThisWeekStat accent="primary" label={t('thisWeek.appointments')} value={String(appointmentsThisWeekCount)} loading={isLoadingScheduleAppointments} />
                  <ThisWeekStat accent="warning" label={t('thisWeek.hoursBlocked')} value={String(hoursBlockedThisWeek)} loading={isLoading || isLoadingExceptions} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border-default shadow-none">
              <CardContent className="flex flex-col gap-3 p-4">
                <h2 className="text-base font-semibold text-text-primary">{t('nextAvailableSlotTitle')}</h2>
                {isLoading || isLoadingBookableWindows ? (
                  <Skeleton className="h-12 w-full" />
                ) : nextAvailableSlot ? (
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
                ) : (
                  <p className="text-sm text-text-tertiary">{t('noUpcomingSlots')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </Tabs>

        {/* Weekly availability + time off: compact, side by side on desktop. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-xl border-border-default shadow-none">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{t('workingHoursTitle')}</h2>
                  <p className="text-sm text-text-tertiary">{t('workingHoursDescription')}</p>
                </div>
                {schedule && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingHours(true)}>
                    {t('editWorkingHours')}
                  </Button>
                )}
              </div>
              {schedule && (
                <ul className="flex flex-col divide-y divide-border-default">
                  {schedule.map((day) => {
                    const dayName = format.dateTime(dayIndexDate(day.dayOfWeek), { weekday: 'long' });
                    const summary = day.isWorkingDay ? formatEffectiveWindowSummary(day, format, t) : undefined;
                    return (
                      <li key={day.dayOfWeek} className="flex items-center justify-between gap-3 py-1.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            // "Not available" is an ordinary schedule state, not
                            // an error -- a neutral dot, never the danger token.
                            className={cn('size-2 shrink-0 rounded-full', day.isWorkingDay ? 'bg-success' : 'bg-neutral')}
                            aria-hidden="true"
                          />
                          <span className="w-24 shrink-0 text-sm font-medium text-text-primary">{dayName}</span>
                          <span className="min-w-0 text-sm text-text-secondary">
                            {summary ? (
                              <>
                                {summary.primary}
                                {summary.breakNote && <span className="text-text-tertiary"> · {summary.breakNote}</span>}
                              </>
                            ) : (
                              <span className="text-text-tertiary">{t('noAvailability')}</span>
                            )}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={t('rowActionsFor', { day: dayName })}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors duration-(--duration-fast) hover:bg-secondary-subtle hover:text-text-secondary"
                            >
                              <Icon icon={MoreVertical} size="sm" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsEditingHours(true)}>{t('editRowHours')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border-default shadow-none">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{t('timeOffTitle')}</h2>
                  <p className="text-sm text-text-tertiary">{t('timeOffDescription')}</p>
                </div>
                <Button size="sm" onClick={() => { setTimeOffDate(undefined); setIsAddingTimeOff(true); }}>
                  <Icon icon={Plus} size="sm" className="me-2" />
                  {t('addTimeOff')}
                </Button>
              </div>
              {isLoadingExceptions ? <Skeleton className="h-16 w-full" /> : <ScheduleExceptionsTable exceptions={exceptions ?? []} />}
            </CardContent>
          </Card>
        </div>

        {schedule &&
          (isDesktop ? (
            <Dialog open={isEditingHours} onOpenChange={handleHoursEditorOpenChange}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('workingHoursTitle')}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <WorkingHoursForm schedule={schedule} onSaved={closeHoursEditor} onCancel={closeHoursEditor} onDirtyChange={setIsHoursFormDirty} />
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
                  <WorkingHoursForm schedule={schedule} onSaved={closeHoursEditor} onCancel={closeHoursEditor} onDirtyChange={setIsHoursFormDirty} />
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
              <ScheduleExceptionForm key={timeOffDate ?? 'blank'} defaultDate={timeOffDate} onAdded={() => setIsAddingTimeOff(false)} />
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
    <div className={cn('flex flex-col gap-0.5 rounded-lg p-2.5', THIS_WEEK_ACCENT_CLASSES[accent])}>
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
 * break might not leave fully bookable. Used by the calendar's day headers
 * and the Weekly Availability list so they can never disagree.
 */
function formatEffectiveWindowSummary(
  day: WorkingHoursDay,
  format: ReturnType<typeof useFormatter>,
  t: ReturnType<typeof useTranslations>,
): { primary: string; breakNote?: string } {
  const { bookableWindows, breaks } = computeEffectiveWindows(day.hours, day.breaks);

  const primary =
    bookableWindows.length > 0
      ? bookableWindows.map((window) => `${formatTimeOfDay(format, window.start)} – ${formatTimeOfDay(format, window.end)}`).join(', ')
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
