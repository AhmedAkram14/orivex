import type {
  Booking,
  CreateBookingRequest,
  Holiday,
  JoinWaitlistRequest,
  RecurringWeeklySchedule,
  ScheduleException,
  SchedulingRules,
  WaitlistEntry,
  WeekDay,
} from '@/features/scheduling/types';

/**
 * In-memory mock "backend" state for `/scheduling/*` — mirrors
 * `doctor-store.ts`'s pattern. `bookings`/`waitlist` remain MSW-only (the
 * patient-facing booking flow is deliberately deferred, blocked on a real
 * doctor-directory feature). `rules`/`doctorAvailability`/
 * `doctorExceptions`/`holidays` are now real backend endpoints
 * (SchedulingModule's own GET/PATCH doctor-availability, doctor-exceptions,
 * holidays, rules), so these four seeds exist purely to keep the frontend
 * test suite deterministic, matching `patient-store.ts`'s `seedProfile()`
 * precedent. No application code outside `src/mocks/` may import this
 * directly; go through `schedulingApi`.
 */
function seedRules(): SchedulingRules {
  return {
    slotDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeMinutes: 60,
    maxBookingWindowDays: 30,
  };
}

/**
 * The doctor's recurring weekly availability — a real backend endpoint
 * (SchedulingModule's GET/PATCH `/scheduling/doctor-availability`); this
 * seed exists purely to keep the frontend test suite deterministic, same
 * reasoning as `seedRules()`. Mirrors `doctor-store.ts`'s former
 * `seedAvailability()` reality (Sun–Thu, 9–5) at the real minute-granularity
 * shape, plus a lunch break on each working day.
 */
function seedDoctorAvailability(): RecurringWeeklySchedule {
  const allDays: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const workingDays: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  return allDays.map((dayOfWeek) => {
    const isWorkingDay = workingDays.includes(dayOfWeek);
    return {
      dayOfWeek,
      isWorkingDay,
      hours: { start: '09:00', end: '17:00' },
      breaks: isWorkingDay ? [{ start: '13:00', end: '14:00' }] : [],
    };
  });
}

/**
 * Vacation days / ad hoc unavailable dates — GET/POST/DELETE
 * `/scheduling/doctor-exceptions` are real backend endpoints
 * (SchedulingModule); an honest empty array: no time off has actually been
 * requested yet, never a fabricated vacation.
 */
function seedDoctorExceptions(): ScheduleException[] {
  return [];
}

/** Booking Architecture (milestone 4) — an honest empty array: no patient has actually booked anything yet, never a fabricated appointment. */
function seedBookings(): Booking[] {
  return [];
}

/** Waiting-list architecture — an honest empty array, same reasoning as `seedBookings`. */
function seedWaitlist(): WaitlistEntry[] {
  return [];
}

/**
 * Holiday support (milestone 6) — `GET /scheduling/holidays` is a real
 * backend endpoint (SchedulingModule's own read-only Holiday table); real,
 * fixed-date Egyptian national holidays (not lunar-calendar ones like Eid,
 * whose exact date shifts yearly and isn't safe to assert without an
 * authoritative calendar source), same seeding reasoning as `seedRules()`.
 */
function seedHolidays(): Holiday[] {
  return [
    { id: 'holiday-1', date: '2026-01-07', name: 'Coptic Christmas Day' },
    { id: 'holiday-2', date: '2026-01-25', name: 'Revolution Day' },
    { id: 'holiday-3', date: '2026-04-25', name: 'Sinai Liberation Day' },
    { id: 'holiday-4', date: '2026-05-01', name: 'Labour Day' },
    { id: 'holiday-5', date: '2026-10-06', name: 'Armed Forces Day' },
  ];
}

let rules: SchedulingRules = seedRules();
let doctorAvailability: RecurringWeeklySchedule = seedDoctorAvailability();
let doctorExceptions: ScheduleException[] = seedDoctorExceptions();
let bookings: Booking[] = seedBookings();
let waitlist: WaitlistEntry[] = seedWaitlist();
let holidays: Holiday[] = seedHolidays();

export function getSchedulingRules(): SchedulingRules {
  return rules;
}

export function getDoctorAvailability(): RecurringWeeklySchedule {
  return doctorAvailability;
}

export function updateDoctorAvailability(schedule: RecurringWeeklySchedule): RecurringWeeklySchedule {
  doctorAvailability = schedule;
  return doctorAvailability;
}

export function getDoctorExceptions(): ScheduleException[] {
  return doctorExceptions;
}

export function addDoctorException(exception: Omit<ScheduleException, 'id'>): ScheduleException {
  const created: ScheduleException = { ...exception, id: `exception-${Date.now()}` };
  doctorExceptions = [...doctorExceptions, created];
  return created;
}

export function removeDoctorException(id: string): void {
  doctorExceptions = doctorExceptions.filter((exception) => exception.id !== id);
}

function bookingsOverlap(a: CreateBookingRequest, b: Booking): boolean {
  return a.slotStart < b.slotEnd && b.slotStart < a.slotEnd;
}

export function getBookings(): Booking[] {
  return bookings.filter((booking) => booking.status === 'confirmed');
}

export type CreateBookingResult = { ok: true; booking: Booking } | { ok: false; reason: 'already-booked' };

/** Real conflict detection against every other confirmed booking — the "this slot was just taken" case docs/roadmaps/frontend-master-plan.md's Phase 9 section calls out by name, not a generic error. */
export function createBooking(request: CreateBookingRequest): CreateBookingResult {
  const conflict = bookings.some((booking) => booking.status === 'confirmed' && bookingsOverlap(request, booking));
  if (conflict) return { ok: false, reason: 'already-booked' };

  const created: Booking = { id: `booking-${Date.now()}`, slotStart: request.slotStart, slotEnd: request.slotEnd, status: 'confirmed' };
  bookings = [...bookings, created];
  return { ok: true, booking: created };
}

export type RescheduleBookingResult = { ok: true; booking: Booking } | { ok: false; reason: 'not-found' | 'already-booked' };

export function rescheduleBooking(id: string, request: CreateBookingRequest): RescheduleBookingResult {
  const existing = bookings.find((booking) => booking.id === id);
  if (!existing) return { ok: false, reason: 'not-found' };

  const conflict = bookings.some(
    (booking) => booking.id !== id && booking.status === 'confirmed' && bookingsOverlap(request, booking),
  );
  if (conflict) return { ok: false, reason: 'already-booked' };

  bookings = bookings.map((booking) =>
    booking.id === id ? { ...booking, slotStart: request.slotStart, slotEnd: request.slotEnd } : booking,
  );
  return { ok: true, booking: bookings.find((booking) => booking.id === id)! };
}

export function cancelBooking(id: string): void {
  bookings = bookings.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' } : booking));
}

export function getWaitlist(): WaitlistEntry[] {
  return waitlist;
}

export function joinWaitlist(request: JoinWaitlistRequest): WaitlistEntry {
  const created: WaitlistEntry = { id: `waitlist-${Date.now()}`, date: request.date, createdAt: new Date().toISOString() };
  waitlist = [...waitlist, created];
  return created;
}

export function getHolidays(): Holiday[] {
  return holidays;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetSchedulingStore(): void {
  rules = seedRules();
  doctorAvailability = seedDoctorAvailability();
  doctorExceptions = seedDoctorExceptions();
  bookings = seedBookings();
  waitlist = seedWaitlist();
  holidays = seedHolidays();
}
