import type { RealtimeEmitterPort } from '../../../../platform/realtime/ports/realtime-emitter.port.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { Message } from '../../domain/entities/message.entity.js';
import type { MessageThread } from '../../domain/entities/message-thread.entity.js';
import type { MessageRepository, MessagingParticipantRole } from '../../domain/repositories/message.repository.js';
import type { MessageThreadRepository } from '../../domain/repositories/message-thread.repository.js';

// Messages Page Overhaul (Phase 2 -- Realtime layer). Mirrors
// RealtimeNotifyingNotificationRepository's exact decorator shape
// (notification module's own precedent): every message producer just calls
// the same `save()`/`saveAllAndMarkThreadRead()` this codebase already
// established, so wrapping the repository here means SendMessageUseCase and
// MarkThreadMessagesReadUseCase need no RealtimeEmitterPort wiring of their
// own.
//
// Unlike NotificationRepository (where the row's own accountId IS the
// recipient), a Message only carries its SENDER's accountId -- resolving
// the RECIPIENT means resolving the thread's other party. `save()` needs
// MessageThreadRepository + both Get*ProfileByIdUseCases to turn
// (patientId, doctorId) into (patientAccountId, doctorAccountId) and pick
// whichever one isn't the sender. `saveAllAndMarkThreadRead()` doesn't need
// any of that: MarkThreadMessagesReadUseCase already filters to only the
// messages NOT sent by the caller before calling this, so every message's
// own `senderAccountId` IS the party to notify (`message.read` -- their
// checkmarks just changed).
export class RealtimeNotifyingMessageRepository implements MessageRepository {
  constructor(
    private readonly inner: MessageRepository,
    private readonly realtimeEmitter: RealtimeEmitterPort,
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  findById(id: string): Promise<Message | null> {
    return this.inner.findById(id);
  }

  findByThreadId(threadId: string): Promise<Message[]> {
    return this.inner.findByThreadId(threadId);
  }

  countUnreadForRecipient(threadId: string, recipientAccountId: string): Promise<number> {
    return this.inner.countUnreadForRecipient(threadId, recipientAccountId);
  }

  countUnreadForAccount(accountId: string, role: MessagingParticipantRole): Promise<number> {
    return this.inner.countUnreadForAccount(accountId, role);
  }

  findLatestMessagesForThreads(threadIds: string[]): Promise<Map<string, Message>> {
    return this.inner.findLatestMessagesForThreads(threadIds);
  }

  countUnreadForThreads(threadIds: string[], recipientAccountId: string): Promise<Map<string, number>> {
    return this.inner.countUnreadForThreads(threadIds, recipientAccountId);
  }

  async save(message: Message): Promise<void> {
    await this.inner.save(message);
    const recipientAccountId = await this.resolveRecipientAccountId(message);
    if (recipientAccountId) {
      this.realtimeEmitter.emitToAccount(recipientAccountId, 'message.sent', {
        threadId: message.getThreadId(),
        messageId: message.getId(),
      });
    }
  }

  async saveAll(messages: Message[]): Promise<void> {
    // Never actually called on the real write path today (mark-read goes
    // through saveAllAndMarkThreadRead below, per that method's own
    // load-bearing-invariant comment) -- kept as a plain pass-through so this
    // decorator still satisfies the full MessageRepository interface.
    await this.inner.saveAll(messages);
  }

  async saveAllAndMarkThreadRead(messages: Message[], thread: MessageThread): Promise<void> {
    await this.inner.saveAllAndMarkThreadRead(messages, thread);
    const senderAccountIds = new Set(messages.map((message) => message.getSenderAccountId()));
    for (const senderAccountId of senderAccountIds) {
      this.realtimeEmitter.emitToAccount(senderAccountId, 'message.read', { threadId: thread.getId() });
    }
  }

  private async resolveRecipientAccountId(message: Message): Promise<string | undefined> {
    const thread = await this.messageThreadRepository.findById(message.getThreadId());
    if (!thread) {
      return undefined;
    }
    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByIdUseCase.execute({ patientProfileId: thread.getPatientId() }),
      this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: thread.getDoctorId() }),
    ]);
    const patientAccountId = patientProfile?.getAccountId();
    const doctorAccountId = doctorProfile?.getAccountId();

    if (patientAccountId && patientAccountId === message.getSenderAccountId()) {
      return doctorAccountId;
    }
    if (doctorAccountId && doctorAccountId === message.getSenderAccountId()) {
      return patientAccountId;
    }
    return undefined;
  }
}
