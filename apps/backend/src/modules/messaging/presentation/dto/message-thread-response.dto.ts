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
  /**
   * Realtime layer (Messages Page Overhaul, Phase 2): the counterparty's own
   * ACCOUNT id (not their patient/doctor profile id) -- the frontend needs
   * this to address a `messaging.typing` emit at the right person via
   * `RealtimeGateway.emitToAccount`. Resolved server-side alongside
   * `counterpartyDisplayName`, same privacy posture: it's the other party's
   * own identifier, not a read-activity timestamp, so exposing it here
   * carries none of the concern the *LastReadAt omission below guards
   * against.
   */
  counterpartyAccountId?: string;
  /**
   * Doctor UX audit remediation (Phase 6 backend proposal, now
   * implemented): the counterparty's own avatar, resolved the same way
   * counterpartyDisplayName already is (same account lookup, same
   * undefined-if-lookup-fails posture -- never fabricated).
   */
  counterpartyAvatarUrl?: string;
  /**
   * Doctor UX audit remediation (Phase 6 backend proposal, now
   * implemented): truncated server-side (GetInboxPreviewsForThreadsUseCase),
   * null when the thread has no messages yet. This is the thread's own
   * content, visible to both parties already inside the thread itself --
   * not the *LastReadAt privacy concern the comment below is about.
   */
  lastMessagePreview?: string | null;
  /**
   * Doctor UX audit remediation (Phase 6 backend proposal, now
   * implemented): per-thread unread count, batched across every thread in
   * one call (GetInboxPreviewsForThreadsUseCase -> MessageRepository's
   * countUnreadForThreads), never a per-thread loop -- see that use case's
   * own doc comment for why this was previously deliberately omitted (the
   * old N+1 shape, not a privacy concern like *LastReadAt below).
   */
  unreadCount?: number;

  // Still deliberately does NOT expose patientLastReadAt/doctorLastReadAt:
  // those are the *other* party's own read-activity timestamps in a
  // two-party thread -- leaking them to the counterparty would disclose
  // exactly when they last opened the conversation, which nothing in this
  // product asks for. The single account-wide unread signal used for the
  // sidebar badge still lives behind its own GET /message-threads/unread-
  // count (GetUnreadCountForAccountUseCase) -- unreadCount above is a
  // separate, per-thread figure for the inbox list, not a replacement.
  static fromDomain(
    thread: MessageThread,
    options?: {
      counterpartyDisplayName?: string;
      counterpartyAccountId?: string;
      counterpartyAvatarUrl?: string;
      lastMessagePreview?: string | null;
      unreadCount?: number;
    },
  ): MessageThreadResponseDto {
    const dto = new MessageThreadResponseDto();
    dto.id = thread.getId();
    dto.patientId = thread.getPatientId();
    dto.doctorId = thread.getDoctorId();
    dto.createdAt = thread.getCreatedAt().toISOString();
    dto.lastMessageAt = thread.getLastMessageAt().toISOString();
    dto.counterpartyDisplayName = options?.counterpartyDisplayName;
    dto.counterpartyAccountId = options?.counterpartyAccountId;
    dto.counterpartyAvatarUrl = options?.counterpartyAvatarUrl;
    dto.lastMessagePreview = options?.lastMessagePreview;
    dto.unreadCount = options?.unreadCount;
    return dto;
  }
}
