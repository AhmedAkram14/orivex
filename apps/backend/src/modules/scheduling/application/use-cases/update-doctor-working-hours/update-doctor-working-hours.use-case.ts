import { randomUUID } from 'node:crypto';

import { ALL_WEEK_DAYS } from '../../../domain/enums/week-day.enum.js';
import { SchedulingDomainError } from '../../../domain/exceptions/scheduling-domain.error.js';
import { WorkingHoursDay } from '../../../domain/entities/working-hours-day.entity.js';
import type { WorkingHoursRepository } from '../../../domain/repositories/working-hours.repository.js';

import type { UpdateDoctorWorkingHoursCommand } from './update-doctor-working-hours.command.js';

// Full replace-all-7 upsert -- the only use case in this module that
// persists working hours. Validates the full 7-day invariant here (not just
// in the DTO) since this is a real domain rule, not a transport concern.
export class UpdateDoctorWorkingHoursUseCase {
  constructor(private readonly workingHoursRepository: WorkingHoursRepository) {}

  async execute(command: UpdateDoctorWorkingHoursCommand): Promise<WorkingHoursDay[]> {
    if (command.days.length !== 7) {
      throw new SchedulingDomainError(`Expected exactly 7 working-hours days, got ${command.days.length}.`);
    }

    const seenDays = new Set(command.days.map((day) => day.dayOfWeek));
    for (const dayOfWeek of ALL_WEEK_DAYS) {
      if (!seenDays.has(dayOfWeek)) {
        throw new SchedulingDomainError(`Missing working-hours entry for "${dayOfWeek}".`);
      }
    }

    const entities = command.days.map((day) =>
      WorkingHoursDay.create(randomUUID(), {
        doctorId: command.doctorId,
        dayOfWeek: day.dayOfWeek,
        isWorkingDay: day.isWorkingDay,
        hours: day.hours,
        breaks: day.breaks,
        pricing: day.pricing,
      }),
    );

    return this.workingHoursRepository.replaceAllForDoctor(command.doctorId, entities);
  }
}
