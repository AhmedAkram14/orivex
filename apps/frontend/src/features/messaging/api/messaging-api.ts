import { apiFetch } from '@/shared/lib/api/client';
import { MESSAGING_PATHS } from '@/features/messaging/api/paths';
import type { Message, MessageThread, MessageThreadAppointment } from '@/features/messaging/api/types';

/**
 * I7 -- Messaging (docs/01-prd.md §2.13): asynchronous, administrative/
 * follow-up communication tied to a booking -- explicitly not diagnosis-
 * via-chat. A thin typed wrapper over `apiFetch`, mirroring `consultationApi`'s
 * own shape.
 */
export const messagingApi = {
  listThreads: () => apiFetch<MessageThread[]>({ path: MESSAGING_PATHS.threads() }),

  /** Lazily creates the thread with this counterparty (a patient or doctor profile id) the first time either party opens it, or returns the existing one. Re-threading (Phase 1): keyed by counterparty profile id, not an appointment id. */
  startOrGetThread: (counterpartyProfileId: string) =>
    apiFetch<MessageThread>({ method: 'POST', path: MESSAGING_PATHS.threads(), body: { counterpartyProfileId } }),

  /** Re-threading (Phase 1): the account-wide unread count backing the sidebar badge (Phase 3). */
  getUnreadCount: () => apiFetch<{ count: number }>({ path: MESSAGING_PATHS.unreadCount() }),

  /** Thread header context (Phase 5): every appointment this pair ever had, for the "Last appointment" line -- small, unordered list, picking the most recent by `scheduledAt` is left to the caller (`use-thread-appointments.ts`). */
  listThreadAppointments: (threadId: string) =>
    apiFetch<MessageThreadAppointment[]>({ path: MESSAGING_PATHS.appointments(threadId) }),

  listMessages: (threadId: string) => apiFetch<Message[]>({ path: MESSAGING_PATHS.messages(threadId) }),

  sendMessage: (threadId: string, body: string, attachmentAssetId?: string) =>
    apiFetch<Message>({ method: 'POST', path: MESSAGING_PATHS.messages(threadId), body: { body, attachmentAssetId } }),

  markThreadRead: (threadId: string) =>
    apiFetch<{ acknowledged: true }>({ method: 'PATCH', path: MESSAGING_PATHS.markRead(threadId) }),
};
