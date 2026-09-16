import { createQueryKeyFactory } from '@/shared/lib/api/query-keys';

export const messageThreadsKeys = createQueryKeyFactory('message-threads');
export const messagesKeys = createQueryKeyFactory('messages');

/** Messages Page Overhaul (Phase 3): the account-wide unread badge's own query key -- distinct from `messageThreadsKeys` so invalidating the inbox list and invalidating the badge are two explicit, independently-testable calls, even though both currently happen together in `use-realtime-socket.ts`'s `message.sent`/`message.read` handlers. */
export const unreadMessageCountKey = ['message-threads', 'unread-count'] as const;
