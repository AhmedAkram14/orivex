import type { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';

import type { ListScheduleExceptionsForDoctorQuery } from './list-schedule-exceptions-for-doctor.query.js';

// Pure read -- mirrors ListNotificationsForAccountUseCase's pattern.
export class ListScheduleExceptionsForDoctorUseCase {
  constructor(private readonly scheduleExceptionRepository: ScheduleExceptionRepository) {}

  async execute(query: ListScheduleExceptionsForDoctorQuery): Promise<ScheduleException[]> {
    return this.scheduleExceptionRepository.findByDoctorId(query.doctorId);
  }
}
