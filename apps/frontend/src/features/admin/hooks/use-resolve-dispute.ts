'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminDisputesKeys } from '@/features/admin/hooks/query-keys';

/** I11 -- Admin dispute resolution: the SuperAdmin's one-time decision. */
export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, resolutionNotes }: { id: string; status: 'resolved' | 'dismissed'; resolutionNotes: string }) =>
      adminApi.resolveDispute(id, status, resolutionNotes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminDisputesKeys.lists() });
    },
  });
}
