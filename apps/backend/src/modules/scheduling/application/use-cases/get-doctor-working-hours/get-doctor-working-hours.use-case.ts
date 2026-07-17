import { ALL_WEEK_DAYS } from '../../../domain/enums/week-day.enum.js';
import { WorkingHoursDay } from '../../../domain/entities/working-hours-day.entity.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';

import type { GetDoctorWorkingHoursQuery } from './get-doctor-working-hours.query.js';

const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

// Pure read. A doctor's schedule always logically exists -- if the doctor
// has never configured one, this returns a computed, unsaved default
// template (all 7 WeekDay values, not working, 09:00-17:00, no breaks)
// rather than an empty list or a 404: the frontend always expects exactly 7
// entries back. Nothing is persisted here; only UpdateDoctorWorkingHours
// UseCase writes.
export class GetDoctorWorkingHoursUseCase {
  constructor(private readonly workingHoursRepository: WorkingHoursRepository) {}

  async execute(query: GetDoctorWorkingHoursQuery): Promise<WorkingHoursDay[]> {
    const existing = await this.workingHoursRepository.findByDoctorId(query.doctorId);
    if (existing.length === 0) {
      return ALL_WEEK_DAYS.map((dayOfWeek) =>
        WorkingHoursDay.create('unconfigured', {
          doctorId: query.doctorId,
          dayOfWeek,
          isWorkingDay: false,
          hours: { start: DEFAULT_START, end: DEFAULT_END },
          breaks: [],
        }),
      );
    }

    const byDay = new Map(existing.map((day) => [day.getDayOfWeek(), day]));
    return ALL_WEEK_DAYS.map((dayOfWeek) => byDay.get(dayOfWeek)!);
  }
}
