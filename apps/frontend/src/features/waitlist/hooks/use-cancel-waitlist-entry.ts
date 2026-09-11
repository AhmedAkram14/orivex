'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { waitlistApi } from '@/features/waitlist/api/waitlist-api';
import { waitlistEntriesKeys } from '@/features/waitlist/hooks/query-keys';

export function useCancelWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => waitlistApi.cancel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: waitlistEntriesKeys.lists() });
    },
  });
}
