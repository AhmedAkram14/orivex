'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messageThreadsKeys } from '@/features/messaging/hooks/query-keys';

/** Opens (creating it on first use) the message thread with a given counterparty (a patient or doctor profile id) -- re-threading (Phase 1): keyed by counterparty, not a specific appointment. */
export function useStartOrGetThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (counterpartyProfileId: string) => messagingApi.startOrGetThread(counterpartyProfileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: messageThreadsKeys.lists() });
    },
  });
}
