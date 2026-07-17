import type { ScheduleExceptionRepository } from '../../../domain/repositories/schedule-exception.repository.js';

import type { RemoveScheduleExceptionCommand } from './remove-schedule-exception.command.js';

// Returns false (not a thrown error) both when the exception doesn't exist
// and when it belongs to a different doctor -- mirrors
// MarkNotificationReadUseCase's ownership-check pattern -- the controller
// maps either case to the same 404, never leaking whether a given id
// belongs to someone else.
export class RemoveScheduleExceptionUseCase {
  constructor(private readonly scheduleExceptionRepository: ScheduleExceptionRepository) {}

  async execute(command: RemoveScheduleExceptionCommand): Promise<boolean> {
    const exception = await this.scheduleExceptionRepository.findById(command.exceptionId);
    if (!exception || exception.getDoctorId() !== command.doctorId) {
      return false;
    }

    await this.scheduleExceptionRepository.deleteById(command.exceptionId);
    return true;
  }
}
