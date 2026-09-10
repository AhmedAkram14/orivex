'use client';

import { useQuery } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messagesKeys } from '@/features/messaging/hooks/query-keys';

export function useThreadMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: messagesKeys.detail(threadId ?? ''),
    queryFn: () => messagingApi.listMessages(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: threadId ? 8_000 : false,
  });
}
