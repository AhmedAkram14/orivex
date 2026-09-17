'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { myDisputesKeys } from '@/features/consultation/hooks/query-keys';

/** Dispute System Hardening Phase 1: the raiser retracting their own dispute while it's still Open. */
export function useWithdrawDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (disputeId: string) => consultationApi.withdrawDispute(disputeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myDisputesKeys.lists() });
    },
  });
}
