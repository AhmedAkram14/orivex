/**
 * Matches MessageThreadResponseDto exactly (MessageThreadController).
 * Re-threading (Messages Page Overhaul, Phase 1): keyed by (patientId,
 * doctorId) now, not by a single Appointment -- `appointmentId` is gone.
 * `lastMessageAt` backs inbox ordering; `counterpartyDisplayName` is
 * resolved server-side (no more client-side id-matching against the
 * caller's own appointments list). No per-thread `unreadCount` -- see
 * `use-unread-message-count.ts` (Phase 3) for the single account-wide
 * badge this DTO deliberately doesn't duplicate per row.
 */
export interface MessageThread {
  id: string;
  patientId: string;
  doctorId: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  lastMessageAt: string;
  /** Resolved server-side; undefined only if the counterparty's own profile/account lookup somehow fails. */
  counterpartyDisplayName?: string;
}

/** Matches MessageResponseDto exactly (MessageThreadController). */
export interface Message {
  id: string;
  threadId: string;
  senderAccountId: string;
  body: string;
  attachmentAssetId: string | null;
  /** ISO timestamp, or null while unread. */
  readAt: string | null;
  /** ISO timestamp. */
  createdAt: string;
}
