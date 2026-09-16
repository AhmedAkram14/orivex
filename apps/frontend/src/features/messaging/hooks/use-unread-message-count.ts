'use client';

import { useQuery } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { unreadMessageCountKey } from '@/features/messaging/hooks/query-keys';

/**
 * Messages Page Overhaul (Phase 3): the account-wide unread-message count
 * backing the sidebar's "Messages" nav badge -- `GET /message-threads/unread-count`
 * (Phase 1). Invalidated live by `use-realtime-socket.ts`'s `message.sent`/
 * `message.read` handlers; the ~60s query default (via QueryClient's own
 * defaults) is the fallback for a dropped socket, same posture as every
 * other messaging query in this feature.
 */
export function useUnreadMessageCount(): number {
  const { data } = useQuery({
    queryKey: unreadMessageCountKey,
    queryFn: () => messagingApi.getUnreadCount(),
  });
  return data?.count ?? 0;
}
