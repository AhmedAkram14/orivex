'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { waitlistKeys } from '@/features/scheduling/hooks/query-keys';

export function useWaitlist() {
  return useQuery({
    queryKey: waitlistKeys.list(),
    queryFn: () => schedulingApi.getWaitlist(),
  });
}
