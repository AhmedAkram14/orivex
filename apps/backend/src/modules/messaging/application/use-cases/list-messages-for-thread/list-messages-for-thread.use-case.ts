import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { Message } from '../../../domain/entities/message.entity.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { ListMessagesForThreadQuery } from './list-messages-for-thread.query.js';

// I7 -- Messaging. Same "never leak existence to a non-party" 404 pattern
// used across this codebase -- a caller who isn't the patient or doctor on
// this thread gets the identical 404 a nonexistent thread id would.
export class ListMessagesForThreadUseCase {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListMessagesForThreadQuery): Promise<Message[]> {
    const thread = await this.messageThreadRepository.findById(query.threadId);
    if (!thread) {
      throw new NotFoundError(`Message thread "${query.threadId}" not found.`);
    }

    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId }),
    ]);
    const isPatientParty = patientProfile !== null && thread.getPatientId() === patientProfile.getId();
    const isDoctorParty = doctorProfile !== null && thread.getDoctorId() === doctorProfile.getId();
    if (!isPatientParty && !isDoctorParty) {
      throw new NotFoundError(`Message thread "${query.threadId}" not found.`);
    }

    return this.messageRepository.findByThreadId(query.threadId);
  }
}
