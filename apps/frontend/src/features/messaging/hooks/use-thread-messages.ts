'use client';

import { useQuery } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messagesKeys } from '@/features/messaging/hooks/query-keys';

export function useThreadMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: messagesKeys.detail(threadId ?? ''),
    queryFn: () => messagingApi.listMessages(threadId!),
    enabled: Boolean(threadId),
    // Messages Page Overhaul (Phase 2): same rationale as
    // use-message-threads.ts -- `message.sent`/`message.read` socket events
    // invalidate this exact query now, so this poll is the fallback for a
    // dropped socket, not the primary channel; lengthened from 8s to ~60s.
    refetchInterval: threadId ? 60_000 : false,
  });
}
