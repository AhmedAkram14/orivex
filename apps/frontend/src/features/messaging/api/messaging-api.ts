import { apiFetch } from '@/shared/lib/api/client';
import { MESSAGING_PATHS } from '@/features/messaging/api/paths';
import type { Message, MessageThread } from '@/features/messaging/api/types';

/**
 * I7 -- Messaging (docs/01-prd.md §2.13): asynchronous, administrative/
 * follow-up communication tied to a booking -- explicitly not diagnosis-
 * via-chat. A thin typed wrapper over `apiFetch`, mirroring `consultationApi`'s
 * own shape.
 */
export const messagingApi = {
  listThreads: () => apiFetch<MessageThread[]>({ path: MESSAGING_PATHS.threads() }),

  /** Lazily creates the thread for this appointment the first time either party opens it, or returns the existing one. */
  startOrGetThread: (appointmentId: string) =>
    apiFetch<MessageThread>({ method: 'POST', path: MESSAGING_PATHS.threads(), body: { appointmentId } }),

  listMessages: (threadId: string) => apiFetch<Message[]>({ path: MESSAGING_PATHS.messages(threadId) }),

  sendMessage: (threadId: string, body: string, attachmentAssetId?: string) =>
    apiFetch<Message>({ method: 'POST', path: MESSAGING_PATHS.messages(threadId), body: { body, attachmentAssetId } }),

  markThreadRead: (threadId: string) =>
    apiFetch<{ acknowledged: true }>({ method: 'PATCH', path: MESSAGING_PATHS.markRead(threadId) }),
};
