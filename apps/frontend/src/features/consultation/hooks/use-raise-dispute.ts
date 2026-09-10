'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { myDisputesKeys } from '@/features/consultation/hooks/query-keys';

export function useRaiseDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, reason }: { appointmentId: string; reason: string }) =>
      consultationApi.raiseDispute(appointmentId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myDisputesKeys.lists() });
    },
  });
}
