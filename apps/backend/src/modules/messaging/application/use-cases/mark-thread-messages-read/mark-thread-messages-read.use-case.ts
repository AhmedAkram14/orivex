import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { MarkThreadMessagesReadCommand } from './mark-thread-messages-read.command.js';

// I7 -- Messaging (read receipts): marks every message in this thread NOT
// sent by the caller as read by them. Same ownership/404 pattern as
// ListMessagesForThreadUseCase.
export class MarkThreadMessagesReadUseCase {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: MarkThreadMessagesReadCommand): Promise<void> {
    const thread = await this.messageThreadRepository.findById(command.threadId);
    if (!thread) {
      throw new NotFoundError(`Message thread "${command.threadId}" not found.`);
    }

    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId }),
    ]);
    const isPatientParty = patientProfile !== null && thread.getPatientId() === patientProfile.getId();
    const isDoctorParty = doctorProfile !== null && thread.getDoctorId() === doctorProfile.getId();
    if (!isPatientParty && !isDoctorParty) {
      throw new NotFoundError(`Message thread "${command.threadId}" not found.`);
    }

    const messages = await this.messageRepository.findByThreadId(command.threadId);
    const unread = messages.filter(
      (message) => message.getSenderAccountId() !== command.callerAccountId && !message.getReadAt(),
    );
    if (unread.length === 0) {
      return;
    }
    for (const message of unread) {
      message.markRead();
    }
    await this.messageRepository.saveAll(unread);
  }
}
