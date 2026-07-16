import type { RecurringWeeklySchedule, ScheduleException, SchedulingRules, WeekDay } from '@/features/scheduling/types';

/**
 * In-memory mock "backend" state for `/scheduling/*` — mirrors
 * `doctor-store.ts`'s pattern. `SchedulingRules` is operational
 * configuration (slot duration, buffer, notice window), not clinical or
 * business-outcome data, so a believable seed is appropriate here — the
 * same reasoning `seedProfile()` (Patient Portal, Phase 8) applied to
 * administrative data, distinct from the honest-empty rule for clinical
 * data.
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
 * The doctor's recurring weekly availability — mirrors `doctor-store.ts`'s
 * former `seedAvailability()` reality (Sun–Thu, 9–5) at the new
 * minute-granularity shape, plus a real lunch break on each working day
 * (Phase 7's shape had no concept of breaks at all). Administrative/config
 * data, same reasoning as `seedRules()` — a believable seed is appropriate.
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

/** Vacation days / ad hoc unavailable dates — an honest empty array: no time off has actually been requested yet, never a fabricated vacation. */
function seedDoctorExceptions(): ScheduleException[] {
  return [];
}

let rules: SchedulingRules = seedRules();
let doctorAvailability: RecurringWeeklySchedule = seedDoctorAvailability();
let doctorExceptions: ScheduleException[] = seedDoctorExceptions();

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

/** Test-only: restores the seed state. Never called from application code. */
export function resetSchedulingStore(): void {
  rules = seedRules();
  doctorAvailability = seedDoctorAvailability();
  doctorExceptions = seedDoctorExceptions();
}
