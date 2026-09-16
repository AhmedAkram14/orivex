import type { Message, MessageThread, MessageThreadAppointment } from '@/features/messaging/api/types';
import { findAccountById, LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';

/**
 * In-memory mock "backend" state for MessagingModule (I7, docs/01-prd.md
 * §2.13) -- mirrors `consultation-store.ts`'s own pattern. Re-threading
 * (Messages Page Overhaul, Phase 1): one thread per (patientAccountId,
 * doctorAccountId) pair, lazily created the first time either party opens
 * it with a given counterparty (same "reuse if it already exists" idiom
 * `StartOrGetMessageThreadUseCase` implements for real).
 * `patientAccountId`/`doctorAccountId` here are mock accounts directly
 * (this mock system's own simplification -- the real backend keys threads
 * by profile id, invisible to the frontend either way since
 * `GET /message-threads` only ever returns the caller's own threads).
 */
interface ThreadRecord {
  id: string;
  patientAccountId: string;
  doctorAccountId: string;
  createdAt: string;
  lastMessageAt: string;
}

const threads: ThreadRecord[] = [];
const messagesByThreadId = new Map<string, Message[]>();
// Thread header context (Phase 5): kept independent of the separate,
// profile-id-keyed appointment mocks in `patient-store.ts`/`doctor-store.ts`
// -- this mock system's own simplification (see the module doc-comment
// above), same posture as `messagesByThreadId`. Empty by default; a test
// seeds this explicitly via `seedThreadAppointments()`.
const appointmentsByThreadId = new Map<string, MessageThreadAppointment[]>();

function isDoctorAccount(accountId: string): boolean {
  return findAccountById(accountId)?.roles.includes('doctor') ?? false;
}

function displayNameFor(accountId: string): string | undefined {
  return findAccountById(accountId)?.fullName;
}

function toThreadDto(thread: ThreadRecord, callerAccountId: string): MessageThread {
  const counterpartyAccountId = thread.patientAccountId === callerAccountId ? thread.doctorAccountId : thread.patientAccountId;
  return {
    id: thread.id,
    patientId: thread.patientAccountId,
    doctorId: thread.doctorAccountId,
    createdAt: thread.createdAt,
    lastMessageAt: thread.lastMessageAt,
    counterpartyDisplayName: displayNameFor(counterpartyAccountId),
    // Realtime layer (Phase 2): the mock store's accounts already ARE the
    // "profile ids" it keys threads by (see the module doc-comment), so the
    // counterparty's own account id is simply the counterparty id itself.
    counterpartyAccountId,
  };
}

export function listThreadsForAccount(callerAccountId: string): MessageThread[] {
  return threads
    .filter((thread) => thread.patientAccountId === callerAccountId || thread.doctorAccountId === callerAccountId)
    .map((thread) => toThreadDto(thread, callerAccountId));
}

/** `counterpartyProfileId` here is a mock account id (this mock system's own simplification, see the module doc-comment). */
export function startOrGetThread(counterpartyProfileId: string, callerAccountId: string): MessageThread {
  const callerIsDoctor = isDoctorAccount(callerAccountId);
  const patientAccountId = callerIsDoctor ? counterpartyProfileId : callerAccountId;
  const doctorAccountId = callerIsDoctor ? callerAccountId : counterpartyProfileId;

  const existing = threads.find((thread) => thread.patientAccountId === patientAccountId && thread.doctorAccountId === doctorAccountId);
  if (existing) {
    return toThreadDto(existing, callerAccountId);
  }

  const now = new Date().toISOString();
  const thread: ThreadRecord = {
    id: `thread-${patientAccountId}-${doctorAccountId}`,
    patientAccountId: patientAccountId || LEGACY_PATIENT_ACCOUNT_ID,
    doctorAccountId: doctorAccountId || LEGACY_DOCTOR_ACCOUNT_ID,
    createdAt: now,
    lastMessageAt: now,
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
  const thread = findThread(threadId);
  if (!thread) return null;
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
  thread.lastMessageAt = message.createdAt;
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

/** Re-threading (Phase 1): the account-wide unread count backing the sidebar badge (Phase 3). */
export function getUnreadCountForAccount(callerAccountId: string): number {
  return threads
    .filter((thread) => thread.patientAccountId === callerAccountId || thread.doctorAccountId === callerAccountId)
    .reduce((total, thread) => {
      const messages = messagesByThreadId.get(thread.id) ?? [];
      return total + messages.filter((message) => message.senderAccountId !== callerAccountId && !message.readAt).length;
    }, 0);
}

/** Thread header context (Phase 5): `GET /message-threads/:id/appointments`'s mock backing -- every appointment this pair ever had, for the "Last appointment" line. */
export function listAppointmentsForThread(threadId: string): MessageThreadAppointment[] {
  return appointmentsByThreadId.get(threadId) ?? [];
}

/** Test-only seam, matching this store's own `resetMessagingStore()` convention -- lets a test control the "Last appointment" context for a thread directly. */
export function seedThreadAppointments(threadId: string, appointments: MessageThreadAppointment[]): void {
  appointmentsByThreadId.set(threadId, appointments);
}

/** Test-only reset seam, matching every other mock store's own `resetX()` convention. */
export function resetMessagingStore(): void {
  threads.length = 0;
  messagesByThreadId.clear();
  appointmentsByThreadId.clear();
}
