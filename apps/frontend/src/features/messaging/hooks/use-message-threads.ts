'use client';

import { useQuery } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messageThreadsKeys } from '@/features/messaging/hooks/query-keys';

/** The caller's own inbox -- every thread they're a party to, patient or doctor side alike. */
export function useMessageThreads() {
  return useQuery({
    queryKey: messageThreadsKeys.list(),
    queryFn: () => messagingApi.listThreads(),
    // Polling, not realtime -- I7 is deliberately asynchronous/administrative
    // communication (docs/01-prd.md §2.13), not a live chat needing a
    // socket. Refetches while the inbox tab is open so a new reply shows up
    // without a manual refresh.
    refetchInterval: 15_000,
  });
}
