/**
 * Matches MessageThreadResponseDto exactly (MessageThreadController).
 * Re-threading (Messages Page Overhaul, Phase 1): keyed by (patientId,
 * doctorId) now, not by a single Appointment -- `appointmentId` is gone.
 * `lastMessageAt` backs inbox ordering; `counterpartyDisplayName` is
 * resolved server-side (no more client-side id-matching against the
 * caller's own appointments list). `use-unread-message-count.ts` (Phase 3)
 * still owns the single account-wide sidebar badge -- `unreadCount` below
 * is a separate, per-thread figure for the inbox list rows, added by the
 * doctor UX audit remediation's Phase 6 backend proposal.
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
  /** Realtime layer (Phase 2): the counterparty's own account id, for addressing a `messaging.typing` emit at them. Same undefined-only-on-lookup-failure guarantee as `counterpartyDisplayName`. */
  counterpartyAccountId?: string;
  /** Same undefined-only-on-lookup-failure guarantee as `counterpartyDisplayName`. */
  counterpartyAvatarUrl?: string;
  /** Truncated server-side; null when the thread has no messages yet. */
  lastMessagePreview?: string | null;
  /** Per-thread unread count, batched server-side across the whole inbox in one call -- not an N+1. */
  unreadCount?: number;
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

/**
 * Matches the small list returned by `GET /message-threads/:id/appointments`
 * (Phase 1) -- just enough to render the thread header's "Last appointment"
 * context (Phase 5). Mirrors ConsultationModule's real `AppointmentStatus`
 * enum exactly (see `features/doctor/api/types.ts`'s own copy of the same
 * union) -- `expired` is a real terminal status (Phase 0), not a stand-in.
 */
export interface MessageThreadAppointment {
  id: string;
  /** ISO timestamp. */
  scheduledAt: string;
  status: 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed' | 'expired';
}
