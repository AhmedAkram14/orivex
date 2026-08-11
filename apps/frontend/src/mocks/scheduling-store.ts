import type {
  AvailabilityWindowData,
  ConsultationPricing,
  Holiday,
  RecurringWeeklySchedule,
  ScheduleException,
  SchedulingRules,
  UpdateAvailabilityWindowPricingRequest,
  WeekDay,
} from '@/features/scheduling/types';
import { getWeekDayName } from '@/features/doctor/lib/week';
import { generateDaySlots } from '@/features/scheduling/utils/slots';
import { resolveDayForDate } from '@/features/scheduling/utils/resolve-day';
import { addDays } from '@/shared/lib/date/week';

/**
 * In-memory mock "backend" state for `/scheduling/*` — mirrors
 * `doctor-store.ts`'s pattern. `rules`/`doctorAvailability`/
 * `doctorExceptions`/`holidays` are real backend endpoints (SchedulingModule's
 * own GET/PATCH doctor-availability, doctor-exceptions, holidays, rules), so
 * these four seeds exist purely to keep the frontend test suite
 * deterministic, matching `patient-store.ts`'s `seedProfile()` precedent.
 * No application code outside `src/mocks/` may import this directly; go
 * through `schedulingApi`.
 */
function seedRules(): SchedulingRules {
  return {
    slotDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeMinutes: 60,
    maxBookingWindowDays: 30,
  };
}

const FREE_PRICING: ConsultationPricing = { pricingType: 'free', feeAmount: null, feeCurrency: null };

/**
 * The doctor's recurring weekly availability — a real backend endpoint
 * (SchedulingModule's GET/PATCH `/scheduling/doctor-availability`); this
 * seed exists purely to keep the frontend test suite deterministic, same
 * reasoning as `seedRules()`. Mirrors `doctor-store.ts`'s former
 * `seedAvailability()` reality (Sun–Thu, 9–5) at the real minute-granularity
 * shape, plus a lunch break on each working day.
 *
 * Consultation Pricing Redesign: each working day defaults to a real Paid
 * price (500 EGP) -- an honest default matching the demo doctor's own
 * former `consultationFeeAmount`, not a silent Free everywhere that would
 * make the whole pricing feature invisible in the mock environment.
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
      pricing: isWorkingDay
        ? ({ pricingType: 'paid', feeAmount: 500, feeCurrency: 'EGP' } satisfies ConsultationPricing)
        : FREE_PRICING,
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
let holidays: Holiday[] = seedHolidays();
// Onboarding Redesign integration-gap closure (2026-07-25): mirrors the real
// backend's AvailabilityWindow -- once a window id has been consumed by the
// mock's own `bookAppointment()` (patient-store.ts), it must stop appearing
// as available, the same "a booked slot simply doesn't come back" contract
// the real GetBookableAvailabilityUseCase guarantees.
const bookedAvailabilityWindowIds = new Set<string>();
// Consultation Pricing Redesign: per-slot pricing overrides -- mirrors the
// real backend's `AvailabilityWindow.pricing` (set once at generation time
// from the template's default, individually overridable while still
// `open`). Windows themselves are never persisted in this mock (generated
// fresh on every read from `doctorAvailability`, same as before); only the
// override survives, keyed by the same `${doctorId}::${isoStart}` id every
// other window-scoped mock function already uses.
const slotPricingOverrides = new Map<string, ConsultationPricing>();
// How far into the future "Upcoming Slots" looks -- mirrors the real
// `SchedulingController.getUpcomingSlots()`'s own fixed 60-day window.
const UPCOMING_SLOTS_WINDOW_DAYS = 60;

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

export function getHolidays(): Holiday[] {
  return holidays;
}

/**
 * Consultation Pricing Redesign: resolves one window's real price -- an
 * individual override if one has been set (`updateUpcomingSlotPricing`),
 * else the generating weekday's own template default. The one place this
 * mock decides a slot's price, shared by both `getAvailabilityWindows`
 * (patient-facing) and `bookAppointment` (patient-store.ts) so a booking
 * always charges exactly what the patient was shown.
 */
export function resolveWindowPricing(doctorId: string, isoStart: string): ConsultationPricing {
  const id = `${doctorId}::${isoStart}`;
  const override = slotPricingOverrides.get(id);
  if (override) return override;

  const start = new Date(isoStart);
  const weekday = getWeekDayName(start);
  const day = resolveDayForDate(start, weekday, doctorAvailability, doctorExceptions, holidays);
  return day.pricing;
}

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): mocks the real
 * `GET /doctors/:id/availability-windows` contract -- reuses the same pure,
 * already-tested slot-generation utils (`resolveDayForDate`/
 * `generateDaySlots`) that used to live inside `BookingFlow` itself, now
 * relocated here since this is test/mock infrastructure, not the
 * production path (the production path gets its slots from the real
 * backend).
 *
 * Consultation Pricing Redesign: `consultationType`/`feeAmount`/
 * `feeCurrency` are each window's own real, per-slot price
 * (`resolveWindowPricing`) -- never a fixed per-doctor value.
 */
export function getAvailabilityWindows(doctorId: string, from: string, to: string): AvailabilityWindowData[] {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const windows: AvailabilityWindowData[] = [];

  for (let cursor = new Date(fromDate); cursor < toDate; cursor = addDays(cursor, 1)) {
    const weekday = getWeekDayName(cursor);
    const day = resolveDayForDate(cursor, weekday, doctorAvailability, doctorExceptions, holidays);
    const slots = generateDaySlots(day, rules, cursor, new Date());

    for (const slot of slots) {
      if (slot.status !== 'available') continue;
      const id = `${doctorId}::${slot.start}`;
      if (bookedAvailabilityWindowIds.has(id)) continue;
      const pricing = resolveWindowPricing(doctorId, slot.start);
      windows.push({
        id,
        doctorId,
        startTime: slot.start,
        endTime: slot.end,
        consultationType: pricing.pricingType,
        feeAmount: pricing.feeAmount,
        feeCurrency: pricing.feeCurrency,
        status: 'open',
      });
    }
  }

  return windows;
}

/**
 * Consultation Pricing Redesign: mocks `GET /scheduling/upcoming-slots` --
 * every generated, still-`open` window for the doctor across the next
 * `UPCOMING_SLOTS_WINDOW_DAYS` days. Reuses `getAvailabilityWindows`'s own
 * generation/pricing logic (this mock has no separate persisted window
 * table to query) rather than re-deriving it.
 */
export function getUpcomingSlots(doctorId: string): AvailabilityWindowData[] {
  const from = new Date();
  const to = addDays(from, UPCOMING_SLOTS_WINDOW_DAYS);
  return getAvailabilityWindows(doctorId, from.toISOString(), to.toISOString());
}

/**
 * Consultation Pricing Redesign: mocks
 * `PATCH /scheduling/upcoming-slots/:id/pricing` -- the per-slot override.
 * Mirrors the real `UpdateAvailabilityWindowPricingUseCase`'s Open-only
 * guard: throws once the window has been booked, same "never leak
 * existence" 404 the real ownership check would produce for a doctor
 * probing an unrelated window id (this mock has only one doctor, so the
 * ownership half of that check never applies).
 */
export function updateUpcomingSlotPricing(
  doctorId: string,
  availabilityWindowId: string,
  request: UpdateAvailabilityWindowPricingRequest,
): AvailabilityWindowData {
  if (bookedAvailabilityWindowIds.has(availabilityWindowId)) {
    throw new Error(`AvailabilityWindow "${availabilityWindowId}" not found.`);
  }

  const isoStart = availabilityWindowId.split('::')[1];
  const isoEnd = new Date(new Date(isoStart).getTime() + rules.slotDurationMinutes * 60_000).toISOString();
  const pricing: ConsultationPricing =
    request.pricingType === 'free'
      ? FREE_PRICING
      : { pricingType: 'paid', feeAmount: request.feeAmount ?? 0, feeCurrency: request.feeCurrency ?? 'EGP' };
  slotPricingOverrides.set(availabilityWindowId, pricing);

  return {
    id: availabilityWindowId,
    doctorId,
    startTime: isoStart,
    endTime: isoEnd,
    consultationType: pricing.pricingType,
    feeAmount: pricing.feeAmount,
    feeCurrency: pricing.feeCurrency,
    status: 'open',
  };
}

export function markAvailabilityWindowBooked(availabilityWindowId: string): void {
  bookedAvailabilityWindowIds.add(availabilityWindowId);
}

export function isAvailabilityWindowBooked(availabilityWindowId: string): boolean {
  return bookedAvailabilityWindowIds.has(availabilityWindowId);
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetSchedulingStore(): void {
  rules = seedRules();
  doctorAvailability = seedDoctorAvailability();
  doctorExceptions = seedDoctorExceptions();
  holidays = seedHolidays();
  bookedAvailabilityWindowIds.clear();
  slotPricingOverrides.clear();
}
