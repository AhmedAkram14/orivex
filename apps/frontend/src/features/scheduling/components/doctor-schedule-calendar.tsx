'use client';

import arLocale from '@fullcalendar/core/locales/ar';
import type { DatesSetArg, DayHeaderContentArg, EventContentArg, EventInput, SlotLabelContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { cn } from '@/shared/lib/cn';
import './doctor-schedule-calendar.css';

export type ScheduleCalendarView = 'week' | 'day' | 'month';

const FC_VIEW: Record<ScheduleCalendarView, string> = {
  week: 'timeGridWeek',
  day: 'timeGridDay',
  month: 'dayGridMonth',
};

export type VisitTypeKey = 'follow_up' | 'consultation' | 'new_patient' | 'procedure' | 'other';

/**
 * The one place appointment colours are decided: visit type -> colour name.
 * Each colour name maps to a `.fc-appt--<name>` class in the stylesheet,
 * which is built from design tokens (blue/green from the status palette,
 * pink/purple from the categorical accent tokens).
 */
export const VISIT_TYPE_COLOR: Record<VisitTypeKey, 'blue' | 'green' | 'pink' | 'purple'> = {
  follow_up: 'blue',
  consultation: 'green',
  new_patient: 'pink',
  procedure: 'purple',
  other: 'purple',
};

export interface CalendarAppointment {
  id: string;
  /** The real instant. */
  start: Date;
  /** The real instant. */
  end?: Date;
  patientName: string;
  timeLabel: string;
  typeLabel?: string;
  visitType: VisitTypeKey;
}

export interface DayAvailability {
  isWorkingDay: boolean;
  /** "HH:mm" windows a patient can actually book (breaks already removed). */
  bookable: Array<{ start: string; end: string }>;
  breaks: Array<{ start: string; end: string }>;
  /** The overall working span (first bookable start to last bookable end), pre-formatted for the day header chip. */
  span?: { full: string; compact: string };
}

export interface ScheduleCalendarHandle {
  prev: () => void;
  next: () => void;
  today: () => void;
  goto: (date: Date) => void;
}

/** A visible range, as `Date`s whose *local* fields are the calendar day (start inclusive, end exclusive). */
export interface VisibleRange {
  start: Date;
  end: Date;
  /** First day of the primary period (the month, for month view). */
  currentStart: Date;
}

export interface DoctorScheduleCalendarProps {
  view: ScheduleCalendarView;
  /** Real date to open on. */
  initialDate: Date;
  locale: string;
  appointments: CalendarAppointment[];
  /** `date`'s local fields are the calendar day being asked about. */
  getDayAvailability: (date: Date) => DayAvailability | undefined;
  onRangeChange: (range: VisibleRange) => void;
  onAppointmentClick: (appointmentId: string) => void;
  /** Timed selection in the week/day views. Both dates are Cairo wall-clock encoded as UTC -- format with `timeZone: 'UTC'`. */
  onSlotSelect: (selection: { start: Date; end: Date }) => void;
  /** A day clicked in the month view. Encoded as UTC like `onSlotSelect`. */
  onDayClick: (day: Date) => void;
  labels: {
    moreLinkText: (count: number) => string;
    appointmentAria: (patient: string, time: string) => string;
    notAvailable: string;
  };
  className?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// The visible day, unless real data (working hours or a booked appointment)
// falls outside it, in which case it grows to include it -- nothing real is
// ever hidden.
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 19;

/**
 * FullCalendar has no named-timezone support without an extra plugin, and
 * this product has exactly one operating timezone (Cairo). So the calendar
 * runs in 'UTC' and every instant handed to it is the Cairo wall-clock
 * reading encoded as if it were UTC (the same "shift so the fields read as
 * Cairo" idea as `getCairoNow`). Nothing here is persisted -- real instants
 * stay on the appointment objects and are only encoded for display.
 */
function toWallClockUtc(instant: Date): Date {
  const cairo = getCairoNow(instant);
  return new Date(Date.UTC(cairo.getFullYear(), cairo.getMonth(), cairo.getDate(), cairo.getHours(), cairo.getMinutes(), cairo.getSeconds()));
}

function utcDayToLocalDate(utcDay: Date): Date {
  return new Date(utcDay.getUTCFullYear(), utcDay.getUTCMonth(), utcDay.getUTCDate());
}

function hmToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function wallClock(utcDay: Date, minutes: number): Date {
  return new Date(Date.UTC(utcDay.getUTCFullYear(), utcDay.getUTCMonth(), utcDay.getUTCDate(), 0, minutes));
}

/**
 * The Doctor Schedule's Week/Day/Month calendar, on FullCalendar (real
 * time-grid, navigation, selection, overlap layout) instead of a hand-built
 * div grid. Data comes in through props -- the real appointments and the
 * real recurring-schedule/exception availability -- and is mapped to events;
 * nothing is invented here. Appointments are deliberately NOT
 * draggable/resizable: the backend has no doctor-side reschedule route, so
 * moving a block would only pretend to persist.
 */
export const DoctorScheduleCalendar = forwardRef<ScheduleCalendarHandle, DoctorScheduleCalendarProps>(function DoctorScheduleCalendar(
  { view, initialDate, locale, appointments, getDayAvailability, onRangeChange, onAppointmentClick, onSlotSelect, onDayClick, labels, className },
  handle,
) {
  const calendarRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);
  const isMonth = view === 'month';
  // FullCalendar treats `initialDate` as an option: handing it a fresh Date
  // every render made it re-fire `datesSet` in an infinite loop. Captured
  // once; later navigation goes through the imperative handle.
  const [initialUtcDate] = useState(() => new Date(Date.UTC(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate())));

  useImperativeHandle(
    handle,
    () => ({
      prev: () => calendarRef.current?.getApi().prev(),
      next: () => calendarRef.current?.getApi().next(),
      today: () => calendarRef.current?.getApi().gotoDate(toWallClockUtc(new Date())),
      goto: (date) => calendarRef.current?.getApi().gotoDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))),
    }),
    [],
  );

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && api.view.type !== FC_VIEW[view]) api.changeView(FC_VIEW[view]);
  }, [view]);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      // Only report a genuinely different range (FullCalendar can call this
      // again for the same range when options are refreshed).
      let changed = false;
      setRange((previous) => {
        if (previous && previous.start.getTime() === arg.start.getTime() && previous.end.getTime() === arg.end.getTime()) return previous;
        changed = true;
        return { start: arg.start, end: arg.end };
      });
      if (!changed) return;
      onRangeChange({
        start: utcDayToLocalDate(arg.start),
        end: utcDayToLocalDate(arg.end),
        currentStart: utcDayToLocalDate(arg.view.currentStart),
      });
    },
    [onRangeChange],
  );

  const availabilityByDay = useMemo(() => {
    const byDay = new Map<number, DayAvailability | undefined>();
    if (!range) return byDay;
    for (let time = range.start.getTime(); time < range.end.getTime(); time += DAY_MS) {
      byDay.set(time, getDayAvailability(utcDayToLocalDate(new Date(time))));
    }
    return byDay;
  }, [range, getDayAvailability]);

  // Real availability as light-grey background events: whole days off, and
  // (in the time views) the hours outside a working day's span. Working
  // hours stay plain white, and breaks are not shaded.
  const backgroundEvents = useMemo<EventInput[]>(() => {
    const events: EventInput[] = [];
    for (const [time, availability] of availabilityByDay) {
      if (!availability) continue;
      const day = new Date(time);
      const key = String(time);
      const isOff = !availability.isWorkingDay || availability.bookable.length === 0;
      if (isOff) {
        events.push({ id: `off-${key}`, start: day, end: new Date(time + DAY_MS), allDay: isMonth, display: 'background', classNames: ['fc-bg-off'] });
        continue;
      }
      if (isMonth) continue;
      const first = Math.min(...availability.bookable.map((window) => hmToMinutes(window.start)));
      const last = Math.max(...availability.bookable.map((window) => hmToMinutes(window.end)));
      if (first > 0) events.push({ id: `pre-${key}`, start: day, end: wallClock(day, first), display: 'background', classNames: ['fc-bg-off'] });
      if (last < 24 * 60) events.push({ id: `post-${key}`, start: wallClock(day, last), end: new Date(time + DAY_MS), display: 'background', classNames: ['fc-bg-off'] });
    }
    return events;
  }, [availabilityByDay, isMonth]);

  const appointmentEvents = useMemo<EventInput[]>(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.patientName,
        start: toWallClockUtc(appointment.start),
        end: appointment.end ? toWallClockUtc(appointment.end) : undefined,
        classNames: ['fc-appt', `fc-appt--${VISIT_TYPE_COLOR[appointment.visitType]}`],
        extendedProps: { timeLabel: appointment.timeLabel, typeLabel: appointment.typeLabel },
      })),
    [appointments],
  );

  const [minHour, maxHour] = useMemo(() => {
    let min = DEFAULT_MIN_HOUR * 60;
    let max = DEFAULT_MAX_HOUR * 60;
    for (const availability of availabilityByDay.values()) {
      for (const window of availability?.bookable ?? []) {
        min = Math.min(min, hmToMinutes(window.start));
        max = Math.max(max, hmToMinutes(window.end));
      }
    }
    for (const appointment of appointments) {
      const start = toWallClockUtc(appointment.start);
      const end = appointment.end ? toWallClockUtc(appointment.end) : new Date(start.getTime() + 30 * 60_000);
      min = Math.min(min, start.getUTCHours() * 60 + start.getUTCMinutes());
      max = Math.max(max, end.getUTCHours() * 60 + end.getUTCMinutes() || 24 * 60);
    }
    return [Math.max(0, Math.floor(min / 60)), Math.min(24, Math.ceil(max / 60))] as const;
  }, [availabilityByDay, appointments]);

  const renderDayHeader = useCallback(
    (arg: DayHeaderContentArg) => {
      const availability = availabilityByDay.get(Date.UTC(arg.date.getUTCFullYear(), arg.date.getUTCMonth(), arg.date.getUTCDate()));
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(arg.date);
      if (isMonth) return <span className="fc-dayheader-weekday">{weekday}</span>;
      const dayNumber = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(arg.date);
      const isOff = !availability || !availability.isWorkingDay || !availability.span;
      return (
        <div className="fc-dayheader">
          <span className="fc-dayheader-weekday">{weekday}</span>
          <span className="fc-dayheader-number">{dayNumber}</span>
          {isOff ? (
            <span className="fc-dayheader-off">{labels.notAvailable}</span>
          ) : (
            <span className="fc-dayheader-chip">
              <span className="fc-chip-full">{availability.span?.full}</span>
              <span className="fc-chip-compact">{availability.span?.compact}</span>
            </span>
          )}
        </div>
      );
    },
    [availabilityByDay, isMonth, locale, labels.notAvailable],
  );

  const renderSlotLabel = useCallback(
    (arg: SlotLabelContentArg) => new Intl.DateTimeFormat(locale, { hour: 'numeric', timeZone: 'UTC' }).format(arg.date),
    [locale],
  );

  // The event content carries the accessible-button semantics (a focusable
  // role=button with a descriptive label, Enter/Space activate it): the click
  // bubbles to FullCalendar's own eventClick handler on the event element.
  const renderEvent = useCallback(
    (arg: EventContentArg) => {
      if (arg.event.display === 'background') return null;
      const { timeLabel = '', typeLabel } = arg.event.extendedProps as { timeLabel?: string; typeLabel?: string };
      const a11y = {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': labels.appointmentAria(arg.event.title, timeLabel),
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.currentTarget.click();
          }
        },
      };
      if (arg.view.type === 'dayGridMonth') {
        return (
          <div className="fc-appt-inline" {...a11y}>
            <span className="fc-appt-time">{timeLabel}</span> <span className="fc-appt-name">{arg.event.title}</span>
          </div>
        );
      }
      return (
        <div className="fc-appt-body" {...a11y}>
          <span className="fc-appt-time">{timeLabel}</span>
          <span className="fc-appt-name">{arg.event.title}</span>
          {typeLabel && <span className="fc-appt-type">{typeLabel}</span>}
        </div>
      );
    },
    [labels],
  );

  return (
    <div className={cn('orivex-fc', className)}>
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={FC_VIEW[view]}
        initialDate={initialUtcDate}
        timeZone="UTC"
        now={() => toWallClockUtc(new Date())}
        locales={[arLocale]}
        locale={locale}
        direction={locale === 'ar' ? 'rtl' : 'ltr'}
        firstDay={0}
        headerToolbar={false}
        // Whole range fits with no inner scroll: the height follows the
        // (compact, 32px/hour) slots.
        height="auto"
        allDaySlot={false}
        nowIndicator
        slotMinTime={`${String(minHour).padStart(2, '0')}:00:00`}
        slotMaxTime={`${String(maxHour).padStart(2, '0')}:00:00`}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        slotLabelContent={renderSlotLabel}
        dayMaxEvents={3}
        moreLinkContent={(arg) => labels.moreLinkText(arg.num)}
        eventOverlap
        slotEventOverlap
        editable={false}
        selectable={!isMonth}
        selectMirror
        unselectAuto={false}
        events={[...backgroundEvents, ...appointmentEvents]}
        datesSet={handleDatesSet}
        dayHeaderContent={renderDayHeader}
        eventContent={renderEvent}
        eventClick={(arg) => {
          if (arg.event.display === 'background') return;
          arg.jsEvent.preventDefault();
          onAppointmentClick(arg.event.id);
        }}
        select={(arg) => onSlotSelect({ start: arg.start, end: arg.end })}
        dateClick={(arg) => {
          if (isMonth) onDayClick(arg.date);
        }}
      />
    </div>
  );
});
