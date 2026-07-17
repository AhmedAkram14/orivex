import { ScheduleException } from '../../../domain/entities/schedule-exception.entity.js';
import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';

import type { AddScheduleExceptionCommand } from './add-schedule-exception.command.js';

// Creates and persists a new exception scoped to the calling doctor's own
// id -- the controller resolves that id via GetDoctorProfileByAccountIdUseCase
// before building the command, so this use case never has to trust a
// caller-supplied doctorId.
export class AddScheduleExceptionUseCase {
  constructor(private readonly scheduleExceptionRepository: ScheduleExceptionRepository) {}

  async execute(command: AddScheduleExceptionCommand): Promise<ScheduleException> {
    const exception = ScheduleException.create({
      doctorId: command.doctorId,
      date: command.date,
      type: command.type,
      hours: command.hours,
      reason: command.reason,
    });

    await this.scheduleExceptionRepository.save(exception);
    return exception;
  }
}
