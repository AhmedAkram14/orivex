'use client';

import arLocale from '@fullcalendar/core/locales/ar';
import type { DatesSetArg, DayHeaderContentArg, EventContentArg, EventInput } from '@fullcalendar/core';
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

export type CalendarAccent = 'info' | 'success' | 'danger' | 'warning' | 'neutral';

export interface CalendarAppointment {
  id: string;
  /** The real instant. */
  start: Date;
  /** The real instant; omitted when the appointment carries no recorded end. */
  end?: Date;
  patientName: string;
  timeLabel: string;
  typeLabel?: string;
  accent: CalendarAccent;
}

export interface DayAvailability {
  isWorkingDay: boolean;
  /** "HH:mm" windows a patient can actually book (breaks already removed). */
  bookable: Array<{ start: string; end: string }>;
  breaks: Array<{ start: string; end: string }>;
  /** Short, already-localized summary shown under the day header (e.g. "10:00 AM – 1:00 PM"). */
  summary?: string;
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
  labels: { moreLinkText: (count: number) => string; appointmentAria: (patient: string, time: string) => string };
  className?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 20;

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

function wallClock(utcDay: Date, time: string): Date {
  const minutes = hmToMinutes(time);
  return new Date(Date.UTC(utcDay.getUTCFullYear(), utcDay.getUTCMonth(), utcDay.getUTCDate(), 0, minutes));
}

/**
 * The Doctor Schedule's Week/Day/Month calendar, on FullCalendar (real
 * time-grid, scrolling, navigation, selection, overlap layout) instead of a
 * hand-built div grid. Data comes in through props -- the real appointments
 * and the real recurring-schedule/exception availability -- and is mapped
 * to events; nothing is invented here. Appointments are deliberately NOT
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
  // every render made it re-fire `datesSet`, which re-rendered the parent,
  // which produced another fresh Date -- an infinite loop. Captured once;
  // later navigation goes through the imperative handle.
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

  // Real availability as background events. Week/Day draw bookable windows
  // (green), breaks (amber) and non-working days (neutral); Month only tints
  // whole days, since hour-level bands would be noise at that scale.
  const backgroundEvents = useMemo<EventInput[]>(() => {
    const events: EventInput[] = [];
    for (const [time, availability] of availabilityByDay) {
      if (!availability) continue;
      const day = new Date(time);
      const key = String(time);
      if (!availability.isWorkingDay) {
        events.push({ id: `na-${key}`, start: day, end: new Date(time + DAY_MS), allDay: isMonth, display: 'background', classNames: ['fc-bg-unavailable'] });
        continue;
      }
      if (isMonth) {
        events.push({ id: `av-${key}`, start: day, end: new Date(time + DAY_MS), allDay: true, display: 'background', classNames: ['fc-bg-available'] });
        continue;
      }
      availability.bookable.forEach((window, index) =>
        events.push({ id: `av-${key}-${index}`, start: wallClock(day, window.start), end: wallClock(day, window.end), display: 'background', classNames: ['fc-bg-available'] }),
      );
      availability.breaks.forEach((brk, index) =>
        events.push({ id: `br-${key}-${index}`, start: wallClock(day, brk.start), end: wallClock(day, brk.end), display: 'background', classNames: ['fc-bg-break'] }),
      );
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
        classNames: ['fc-appt', `fc-appt--${appointment.accent}`],
        extendedProps: { timeLabel: appointment.timeLabel, typeLabel: appointment.typeLabel },
      })),
    [appointments],
  );

  // Show the whole working day (and any booked appointment) rather than a
  // fixed window, but never less than a normal 8AM-8PM day.
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
      const startMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
      min = Math.min(min, startMinutes);
      max = Math.max(max, startMinutes + 60);
    }
    return [Math.max(0, Math.floor(min / 60)), Math.min(24, Math.ceil(max / 60))] as const;
  }, [availabilityByDay, appointments]);

  // The grid may extend to fit an out-of-hours appointment, but it should
  // open scrolled to where the working day starts, not at the extreme.
  const scrollTime = useMemo(() => {
    let earliest = DEFAULT_MIN_HOUR * 60;
    let found = false;
    for (const availability of availabilityByDay.values()) {
      for (const window of availability?.bookable ?? []) {
        const start = hmToMinutes(window.start);
        earliest = found ? Math.min(earliest, start) : start;
        found = true;
      }
    }
    const hour = Math.max(0, Math.floor(earliest / 60) - 1);
    return `${String(hour).padStart(2, '0')}:00:00`;
  }, [availabilityByDay]);

  // FullCalendar applies `scrollTime` only on first render / view change, but
  // the real slot range and working hours arrive after data loads -- scroll
  // explicitly once they are known so the grid opens on the working day.
  useEffect(() => {
    calendarRef.current?.getApi().scrollToTime(scrollTime);
  }, [scrollTime, minHour, maxHour, view]);

  const renderDayHeader = useCallback(
    (arg: DayHeaderContentArg) => {
      const availability = availabilityByDay.get(Date.UTC(arg.date.getUTCFullYear(), arg.date.getUTCMonth(), arg.date.getUTCDate()));
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(arg.date);
      if (isMonth) return <span className="fc-dayheader-weekday">{weekday}</span>;
      const dayNumber = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(arg.date);
      return (
        <div className="fc-dayheader">
          <span className="fc-dayheader-weekday">{weekday}</span>
          <span className="fc-dayheader-number">{dayNumber}</span>
          {availability?.summary && (
            <span className={cn('fc-dayheader-summary', availability.isWorkingDay ? 'fc-dayheader-summary--on' : 'fc-dayheader-summary--off')}>
              {availability.summary}
            </span>
          )}
        </div>
      );
    },
    [availabilityByDay, isMonth, locale],
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
        height={isMonth ? 'auto' : 640}
        expandRows={!isMonth}
        allDaySlot={false}
        nowIndicator
        slotMinTime={`${String(minHour).padStart(2, '0')}:00:00`}
        slotMaxTime={`${String(maxHour).padStart(2, '0')}:00:00`}
        scrollTime={scrollTime}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        slotLabelFormat={{ hour: 'numeric', meridiem: 'short' }}
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
