import type { MessageThread } from '../../domain/entities/message-thread.entity.js';

export class MessageThreadResponseDto {
  id!: string;
  patientId!: string;
  doctorId!: string;
  createdAt!: string;
  /** Re-threading (Phase 1): backs inbox ordering (most recently active conversation first). */
  lastMessageAt!: string;
  /**
   * Resolved server-side (decision 3 of the Messages Page Overhaul plan) --
   * the other party's display name, eliminating the previous fragile
   * client-side id-matching against the caller's own appointments list.
   * Undefined only in the unlikely case the counterparty's own
   * account/profile lookup fails; never fabricated.
   */
  counterpartyDisplayName?: string;

  // Deliberately carries no per-thread unread count and does NOT expose
  // patientLastReadAt/doctorLastReadAt: (1) those are the *other* party's
  // own read-activity timestamps in a two-party thread -- leaking them to
  // the counterparty would disclose exactly when they last opened the
  // conversation, which nothing in this product asks for; (2) a per-thread
  // unread count is exactly the shape that forced the old N+1 loop this
  // list endpoint used to run (one countUnreadForRecipient call per row).
  // The single account-wide unread signal now lives behind its own
  // GET /message-threads/unread-count (GetUnreadCountForAccountUseCase,
  // one join query, never a per-thread loop) -- see
  // MessageThreadController.listMyThreads/getUnreadCount.
  static fromDomain(thread: MessageThread, options?: { counterpartyDisplayName?: string }): MessageThreadResponseDto {
    const dto = new MessageThreadResponseDto();
    dto.id = thread.getId();
    dto.patientId = thread.getPatientId();
    dto.doctorId = thread.getDoctorId();
    dto.createdAt = thread.getCreatedAt().toISOString();
    dto.lastMessageAt = thread.getLastMessageAt().toISOString();
    dto.counterpartyDisplayName = options?.counterpartyDisplayName;
    return dto;
  }
}
