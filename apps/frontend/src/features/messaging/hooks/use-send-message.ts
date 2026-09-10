'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messagesKeys, messageThreadsKeys } from '@/features/messaging/hooks/query-keys';

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, attachmentAssetId }: { body: string; attachmentAssetId?: string }) =>
      messagingApi.sendMessage(threadId, body, attachmentAssetId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messagesKeys.detail(threadId) }),
        // Refreshes the inbox's own preview/unread-count row for this thread.
        queryClient.invalidateQueries({ queryKey: messageThreadsKeys.lists() }),
      ]);
    },
  });
}
