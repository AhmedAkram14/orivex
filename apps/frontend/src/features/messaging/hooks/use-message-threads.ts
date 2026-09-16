'use client';

import { useQuery } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messageThreadsKeys } from '@/features/messaging/hooks/query-keys';

/** The caller's own inbox -- every thread they're a party to, patient or doctor side alike. */
export function useMessageThreads() {
  return useQuery({
    queryKey: messageThreadsKeys.list(),
    queryFn: () => messagingApi.listThreads(),
    // Messages Page Overhaul (Phase 2): sockets are now the primary delivery
    // mechanism (`message.sent`/`message.read` invalidate this query --
    // use-realtime-socket.ts) -- this interval is the "fail gracefully"
    // fallback for a dropped/misbehaving socket, not the main path anymore,
    // so it's lengthened from 15s to ~60s rather than removed entirely
    // (decision 5 of the plan).
    refetchInterval: 60_000,
  });
}
