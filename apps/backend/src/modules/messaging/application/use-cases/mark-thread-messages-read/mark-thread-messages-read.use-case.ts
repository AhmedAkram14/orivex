import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { MarkThreadMessagesReadCommand } from './mark-thread-messages-read.command.js';

// I7 -- Messaging (read receipts): marks every message in this thread NOT
// sent by the caller as read by them. Same ownership/404 pattern as
// ListMessagesForThreadUseCase.
//
// LOAD-BEARING INVARIANT (Messages Page Overhaul, Phase 1): Message.readAt
// and the thread's own *LastReadAt (patientLastReadAt/doctorLastReadAt)
// MUST be written together, in the same transaction --
// MessageRepository.saveAllAndMarkThreadRead() is the only write path that
// does this. *LastReadAt must always be >= MAX(Message.readAt) for that
// side: if a future "mark all read" path ever updated only the thread's
// columns (skipping this method), it would leave stale per-message
// checkmarks; if it updated only messages (skipping the thread), the
// unread badge would disagree with what's actually been read. Both would
// also silently miss the Phase 2 realtime `message.read` emit, which fires
// from saveAllAndMarkThreadRead()'s own implementation -- never bypass it.
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
    const readAt = new Date();
    for (const message of unread) {
      message.markRead();
    }
    if (isPatientParty) {
      thread.markReadByPatient(readAt);
    } else {
      thread.markReadByDoctor(readAt);
    }
    await this.messageRepository.saveAllAndMarkThreadRead(unread, thread);
  }
}
