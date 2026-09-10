'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingApi } from '@/features/messaging/api/messaging-api';
import { messageThreadsKeys } from '@/features/messaging/hooks/query-keys';

/** Opens (creating it on first use) the message thread tied to a specific appointment -- the "Message" entry point on an appointment card. */
export function useStartOrGetThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => messagingApi.startOrGetThread(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: messageThreadsKeys.lists() });
    },
  });
}
