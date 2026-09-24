import type { Message } from '../entities/message.entity.js';
import type { MessageThread } from '../entities/message-thread.entity.js';

export type MessagingParticipantRole = 'patient' | 'doctor';

export interface MessageRepository {
  findById(id: string): Promise<Message | null>;
  // Oldest first -- a chat thread reads chronologically top-to-bottom.
  findByThreadId(threadId: string): Promise<Message[]>;
  // Backs the per-thread unread-count badge -- counts messages in this thread
  // NOT sent by the given account and not yet read.
  countUnreadForRecipient(threadId: string, recipientAccountId: string): Promise<number>;
  // Re-threading (Phase 1): backs the sidebar's single unread-count badge --
  // one join query (Message through MessageThread, scoped to every thread
  // this account is a party to on the given side, counting messages newer
  // than that side's own lastReadAt and not sent by the caller) rather than
  // first listing thread ids and counting per thread (that shape forces the
  // badge endpoint to list every thread just to get ids to count -- one
  // query pretending to save one query).
  countUnreadForAccount(accountId: string, role: MessagingParticipantRole): Promise<number>;
  // Doctor UX audit remediation (Phase 6 backend proposal): backs the inbox
  // list's per-row last-message preview. One query for every thread in the
  // caller's inbox (a Postgres DISTINCT ON, see the Prisma implementation),
  // never a per-thread loop -- the same "batch it, don't N+1 it" discipline
  // as countUnreadForAccount above. Threads with zero messages simply have
  // no entry in the returned map.
  findLatestMessagesForThreads(threadIds: string[]): Promise<Map<string, Message>>;
  // Doctor UX audit remediation (Phase 6 backend proposal): backs the inbox
  // list's per-row unread badge -- one grouped query for every thread in the
  // caller's inbox, not per-thread. Uses the same "unread" definition as
  // countUnreadForRecipient (not sent by recipientAccountId, readAt null),
  // just batched across threads instead of one at a time. Threads with no
  // unread messages simply have no entry in the returned map.
  countUnreadForThreads(threadIds: string[], recipientAccountId: string): Promise<Map<string, number>>;
  save(message: Message): Promise<void>;
  saveAll(messages: Message[]): Promise<void>;
  // MarkThreadMessagesReadUseCase's load-bearing invariant: Message.readAt
  // and the thread's own *LastReadAt must be written together, atomically,
  // in the same transaction -- *LastReadAt must always be >=
  // MAX(Message.readAt) for that side. A future realtime `message.read`
  // emit (Phase 2) will fire from this method's implementation, so any
  // write path that updates the thread without going through this same
  // transactional method would silently miss that emit later.
  saveAllAndMarkThreadRead(messages: Message[], thread: MessageThread): Promise<void>;
}
