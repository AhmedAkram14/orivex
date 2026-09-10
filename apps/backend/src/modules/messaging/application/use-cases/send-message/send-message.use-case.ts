import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { Message } from '../../../domain/entities/message.entity.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { SendMessageCommand } from './send-message.command.js';

// I7 -- Messaging. Verifies the sender is a genuine party to the thread
// (defense-in-depth, independent of whatever the presentation layer already
// checked) before ever persisting a message.
export class SendMessageUseCase {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: SendMessageCommand): Promise<Message> {
    const thread = await this.messageThreadRepository.findById(command.threadId);
    if (!thread) {
      throw new NotFoundError(`Message thread "${command.threadId}" not found.`);
    }

    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.senderAccountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.senderAccountId }),
    ]);
    const isPatientParty = patientProfile !== null && thread.getPatientId() === patientProfile.getId();
    const isDoctorParty = doctorProfile !== null && thread.getDoctorId() === doctorProfile.getId();
    if (!isPatientParty && !isDoctorParty) {
      throw new ForbiddenError('Only a party to this thread may send a message in it.');
    }

    const message = Message.send({
      threadId: command.threadId,
      senderAccountId: command.senderAccountId,
      body: command.body,
      attachmentAssetId: command.attachmentAssetId,
    });
    await this.messageRepository.save(message);
    return message;
  }
}
