'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { bookingsKeys } from '@/features/scheduling/hooks/query-keys';

export function useBookings() {
  return useQuery({
    queryKey: bookingsKeys.list(),
    queryFn: () => schedulingApi.getBookings(),
  });
}
