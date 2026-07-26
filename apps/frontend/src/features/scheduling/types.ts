import type { ConsultationType } from '@/features/patient/api/types';

/**
 * The Scheduling & Appointment Infrastructure's core domain model (Phase 9)
 * — the shared foundation every future scheduling surface (Doctor
 * Availability, the Appointment Calendar, Booking, and eventually
 * Consultation/Receptionist/Hospital Admin) builds on, rather than each
 * inventing its own shape. Deliberately richer than Phase 7's
 * `AvailabilityBlockData` (hour-granularity, no breaks, no exceptions) —
 * that type's own doc comment already anticipated this: "this is what
 * `SchedulingModule`'s real `AvailabilityWindow` will eventually replace...
 * a data-source change, not a UI rewrite."
 */

export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

/** 24-hour "HH:mm" (e.g. "09:30") — the canonical storage/wire format for a time-of-day value in this module. Never a `Date`: a recurring weekly time isn't tied to any specific day. */
export type TimeOfDay = string;

export interface TimeRange {
  start: TimeOfDay;
  end: TimeOfDay;
}

/** One day's recurring working hours plus its own breaks (e.g. lunch) — the building block a `RecurringWeeklySchedule` has exactly one of per `WeekDay`. */
export interface WorkingHoursDay {
  dayOfWeek: WeekDay;
  isWorkingDay: boolean;
  hours: TimeRange;
  breaks: TimeRange[];
}

/** Always exactly 7 entries, one per `WeekDay` — a doctor's standing weekly template before any date-specific exception is applied. */
export type RecurringWeeklySchedule = WorkingHoursDay[];

export type ScheduleExceptionType = 'vacation' | 'unavailable' | 'extra-hours';

/**
 * A one-off override to the recurring weekly schedule for a specific date —
 * a vacation day, an ad hoc unavailable date, or (rarer) extra hours added
 * outside the normal recurring pattern. `hours` only applies to
 * `extra-hours`; `vacation`/`unavailable` simply block the whole date.
 */
export interface ScheduleException {
  id: string;
  /** ISO date (no time). */
  date: string;
  type: ScheduleExceptionType;
  hours?: TimeRange;
  reason?: string;
}

/**
 * Slot-generation and booking-window policy — the architecture Milestone 6
 * (Scheduling Rules) governs. A single global default today; per-doctor
 * overrides are a real, anticipated extension point (not built yet — no
 * requirement for one exists until a real `SchedulingModule` integration
 * needs it), so callers must not assume this is doctor-scoped.
 */
export interface SchedulingRules {
  slotDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxBookingWindowDays: number;
}

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'past';

/** A single concrete, generated bookable slot — the output of Milestone 6's slot-generation architecture, always tied to a real instant (not just a time-of-day), since a slot always exists on a specific date. */
export interface TimeSlotData {
  id: string;
  /** ISO timestamp. */
  start: string;
  /** ISO timestamp. */
  end: string;
  status: SlotStatus;
}

export type ConflictReason =
  | 'outside-working-hours'
  | 'inside-break'
  | 'already-booked'
  | 'insufficient-notice'
  | 'beyond-booking-window';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): a real,
 * concurrency-safe bookable slot — backed by the real backend
 * `AvailabilityWindow` aggregate (`GET /doctors/:id/availability-windows`),
 * lazily materialized server-side from the doctor's own recurring working
 * hours + exceptions + holidays. Replaces the old Milestone-4 "Booking
 * Architecture" (`Booking`/`CreateBookingRequest`, MSW-only, no doctor id,
 * no real reservation semantics) now that a real doctor directory and a
 * real `POST /appointments` both exist -- never re-introduce a second,
 * client-generated slot model alongside this one.
 */
export interface AvailabilityWindowData {
  id: string;
  doctorId: string;
  /** ISO timestamp. */
  startTime: string;
  /** ISO timestamp. */
  endTime: string;
  consultationType: ConsultationType;
  status: 'open' | 'held' | 'booked';
}

/**
 * Holiday support (Milestone 6) — a global, doctor-agnostic non-working
 * date (distinct from `ScheduleException`, which is one doctor's own
 * vacation/unavailable date). `resolveDayForDate` blocks a holiday date
 * regardless of the recurring template, unless the doctor explicitly adds
 * an `extra-hours` exception on that same date — a deliberate override,
 * not an accident.
 */
export interface Holiday {
  id: string;
  /** ISO date (no time). */
  date: string;
  name: string;
}
