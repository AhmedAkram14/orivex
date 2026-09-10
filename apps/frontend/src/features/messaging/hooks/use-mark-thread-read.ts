'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messagesKeys, messageThreadsKeys } from '@/features/messaging/hooks/query-keys';

/** Read receipts: marks every message in this thread not sent by the caller as read by them -- called when a thread panel opens. */
export function useMarkThreadRead(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => messagingApi.markThreadRead(threadId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messagesKeys.detail(threadId) }),
        queryClient.invalidateQueries({ queryKey: messageThreadsKeys.lists() }),
      ]);
    },
  });
}
