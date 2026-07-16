'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { waitlistKeys } from '@/features/scheduling/hooks/query-keys';
import type { JoinWaitlistRequest } from '@/features/scheduling/types';

export function useJoinWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: JoinWaitlistRequest) => schedulingApi.joinWaitlist(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.list() });
    },
  });
}
