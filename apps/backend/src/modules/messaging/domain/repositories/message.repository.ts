import type { Message } from '../entities/message.entity.js';

export interface MessageRepository {
  findById(id: string): Promise<Message | null>;
  // Oldest first -- a chat thread reads chronologically top-to-bottom.
  findByThreadId(threadId: string): Promise<Message[]>;
  // Backs the inbox's unread-count badge -- counts messages in this thread
  // NOT sent by the given account and not yet read.
  countUnreadForRecipient(threadId: string, recipientAccountId: string): Promise<number>;
  save(message: Message): Promise<void>;
  saveAll(messages: Message[]): Promise<void>;
}
