import type { Message, MessageThread } from '@/features/messaging/api/types';
import { findAccountById, LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';

/**
 * In-memory mock "backend" state for MessagingModule (I7, docs/01-prd.md
 * §2.13) -- mirrors `consultation-store.ts`'s own pattern. One thread per
 * appointment id, lazily created the first time either party opens it (same
 * "reuse if it already exists" idiom `StartOrGetMessageThreadUseCase`
 * implements for real). `patientAccountId`/`doctorAccountId` here are mock
 * accounts directly (this mock system's own simplification -- the real
 * backend keys threads by profile id, invisible to the frontend either way
 * since `GET /message-threads` only ever returns the caller's own threads).
 */
interface ThreadRecord {
  id: string;
  appointmentId: string;
  patientAccountId: string;
  doctorAccountId: string;
  createdAt: string;
}

const threads: ThreadRecord[] = [];
const messagesByThreadId = new Map<string, Message[]>();

function isDoctorAccount(accountId: string): boolean {
  return findAccountById(accountId)?.roles.includes('doctor') ?? false;
}

function toThreadDto(thread: ThreadRecord, callerAccountId: string): MessageThread {
  const unread = (messagesByThreadId.get(thread.id) ?? []).filter(
    (message) => message.senderAccountId !== callerAccountId && !message.readAt,
  ).length;
  return {
    id: thread.id,
    appointmentId: thread.appointmentId,
    patientId: thread.patientAccountId,
    doctorId: thread.doctorAccountId,
    createdAt: thread.createdAt,
    unreadCount: unread,
  };
}

export function listThreadsForAccount(callerAccountId: string): MessageThread[] {
  return threads
    .filter((thread) => thread.patientAccountId === callerAccountId || thread.doctorAccountId === callerAccountId)
    .map((thread) => toThreadDto(thread, callerAccountId));
}

export function startOrGetThread(appointmentId: string, callerAccountId: string): MessageThread {
  const existing = threads.find((thread) => thread.appointmentId === appointmentId);
  if (existing) {
    return toThreadDto(existing, callerAccountId);
  }

  const callerIsDoctor = isDoctorAccount(callerAccountId);
  const thread: ThreadRecord = {
    id: `thread-${appointmentId}`,
    appointmentId,
    patientAccountId: callerIsDoctor ? LEGACY_PATIENT_ACCOUNT_ID : callerAccountId,
    doctorAccountId: callerIsDoctor ? callerAccountId : LEGACY_DOCTOR_ACCOUNT_ID,
    createdAt: new Date().toISOString(),
  };
  threads.push(thread);
  messagesByThreadId.set(thread.id, []);
  return toThreadDto(thread, callerAccountId);
}

function findThread(threadId: string): ThreadRecord | undefined {
  return threads.find((thread) => thread.id === threadId);
}

export function listMessages(threadId: string): Message[] {
  return messagesByThreadId.get(threadId) ?? [];
}

export function sendMessage(threadId: string, senderAccountId: string, body: string, attachmentAssetId?: string): Message | null {
  if (!findThread(threadId)) return null;
  const message: Message = {
    id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    threadId,
    senderAccountId,
    body: body.trim(),
    attachmentAssetId: attachmentAssetId ?? null,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  messagesByThreadId.set(threadId, [...(messagesByThreadId.get(threadId) ?? []), message]);
  return message;
}

export function markThreadRead(threadId: string, callerAccountId: string): boolean {
  if (!findThread(threadId)) return false;
  const messages = messagesByThreadId.get(threadId) ?? [];
  const now = new Date().toISOString();
  messagesByThreadId.set(
    threadId,
    messages.map((message) =>
      message.senderAccountId !== callerAccountId && !message.readAt ? { ...message, readAt: now } : message,
    ),
  );
  return true;
}

/** Test-only reset seam, matching every other mock store's own `resetX()` convention. */
export function resetMessagingStore(): void {
  threads.length = 0;
  messagesByThreadId.clear();
}
