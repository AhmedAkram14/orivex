import { ScheduleExceptionType } from '../../../domain/enums/schedule-exception-type.enum.js';
import { ALL_WEEK_DAYS, type WeekDay } from '../../../domain/enums/week-day.enum.js';
import type { HolidayRepository } from '../../../domain/repositories/holiday.repository.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';

export interface GetDoctorsOpenOnDatesQuery {
  doctorIds: string[];
  /** ISO "YYYY-MM-DD" dates, e.g. [today, tomorrow]. */
  dates: string[];
}

function weekDayOf(date: string): WeekDay {
  // `date` is a plain "YYYY-MM-DD" -- parse at UTC midnight so the resolved
  // weekday never shifts with the server's local timezone.
  const jsDay = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return ALL_WEEK_DAYS[jsDay];
}

// Batched, read-only "is this doctor open on this date" signal -- backs the
// Popular Doctors "Available Today/Tomorrow" chip. Deliberately NOT built on
// GetBookableAvailabilityUseCase: that use case lazily materializes
// AvailabilityWindow rows as a side effect, which is unsafe to trigger from
// an anonymous batch read on every landing-page load. This reflects the
// doctor's *configured* schedule for the date (working hours + exceptions +
// holidays) -- not a live "there's an open slot right now" guarantee, since
// it doesn't account for SchedulingRules minimum-notice windows or exact
// per-slot occupancy.
export class GetDoctorsOpenOnDatesUseCase {
  constructor(
    private readonly workingHoursRepository: WorkingHoursRepository,
    private readonly scheduleExceptionRepository: ScheduleExceptionRepository,
    private readonly holidayRepository: HolidayRepository,
  ) {}

  async execute(query: GetDoctorsOpenOnDatesQuery): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();
    if (query.doctorIds.length === 0 || query.dates.length === 0) {
      return result;
    }

    const [workingHoursByDoctor, exceptions, holidays] = await Promise.all([
      this.workingHoursRepository.findByDoctorIds(query.doctorIds),
      this.scheduleExceptionRepository.findByDoctorIdsAndDates(query.doctorIds, query.dates),
      this.holidayRepository.findAll(),
    ]);

    const holidayDates = new Set(holidays.map((holiday) => holiday.getDate()));
    const exceptionsByDoctorAndDate = new Map<string, Map<string, ScheduleExceptionType>>();
    for (const exception of exceptions) {
      const byDate = exceptionsByDoctorAndDate.get(exception.getDoctorId()) ?? new Map<string, ScheduleExceptionType>();
      byDate.set(exception.getDate(), exception.getType());
      exceptionsByDoctorAndDate.set(exception.getDoctorId(), byDate);
    }

    for (const doctorId of query.doctorIds) {
      const openDates = new Set<string>();
      const workingDays = workingHoursByDoctor.get(doctorId) ?? [];
      const isNormallyOpen = new Map(workingDays.map((day) => [day.getDayOfWeek(), day.getIsWorkingDay()]));

      for (const date of query.dates) {
        if (holidayDates.has(date)) {
          continue;
        }
        const exceptionType = exceptionsByDoctorAndDate.get(doctorId)?.get(date);
        if (exceptionType === ScheduleExceptionType.Vacation || exceptionType === ScheduleExceptionType.Unavailable) {
          continue;
        }
        const open = exceptionType === ScheduleExceptionType.ExtraHours || (isNormallyOpen.get(weekDayOf(date)) ?? false);
        if (open) {
          openDates.add(date);
        }
      }

      if (openDates.size > 0) {
        result.set(doctorId, openDates);
      }
    }

    return result;
  }
}
