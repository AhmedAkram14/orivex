import type { MessageRepository } from '../../../domain/repositories/message.repository.js';

const PREVIEW_MAX_LENGTH = 140;

export interface ThreadInboxPreview {
  /** Truncated, whitespace-collapsed last message body. Null when the thread has no messages yet. */
  lastMessagePreview: string | null;
  unreadCount: number;
}

function truncatePreview(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > PREVIEW_MAX_LENGTH ? `${collapsed.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : collapsed;
}

// Doctor UX audit remediation (Phase 6 backend proposal, now implemented):
// composes MessageRepository's two batched queries (never a per-thread
// loop -- see both methods' own doc comments) into the per-thread inbox
// metadata MessageThreadResponseDto needed. Kept as its own use case rather
// than folded into ListMessageThreadsForAccountUseCase because that use
// case returns MessageThread domain entities (a persistence-shaped
// aggregate) -- this result is a presentation-layer read model, composed
// the same way MessageThreadController.resolveCounterpartyInfo already
// composes counterparty display data alongside the raw thread list.
export class GetInboxPreviewsForThreadsUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  async execute(threadIds: string[], recipientAccountId: string): Promise<Map<string, ThreadInboxPreview>> {
    const [latestMessages, unreadCounts] = await Promise.all([
      this.messageRepository.findLatestMessagesForThreads(threadIds),
      this.messageRepository.countUnreadForThreads(threadIds, recipientAccountId),
    ]);

    const previews = new Map<string, ThreadInboxPreview>();
    for (const threadId of threadIds) {
      const latestMessage = latestMessages.get(threadId);
      previews.set(threadId, {
        lastMessagePreview: latestMessage ? truncatePreview(latestMessage.getBody()) : null,
        unreadCount: unreadCounts.get(threadId) ?? 0,
      });
    }
    return previews;
  }
}
