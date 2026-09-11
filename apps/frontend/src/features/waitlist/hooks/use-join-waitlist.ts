'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { waitlistApi } from '@/features/waitlist/api/waitlist-api';
import { waitlistEntriesKeys } from '@/features/waitlist/hooks/query-keys';
import type { JoinWaitlistParams } from '@/features/waitlist/api/types';

export function useJoinWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: JoinWaitlistParams) => waitlistApi.join(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: waitlistEntriesKeys.lists() });
    },
  });
}
