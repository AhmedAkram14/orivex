'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { bookingsKeys } from '@/features/scheduling/hooks/query-keys';
import type { CreateBookingRequest } from '@/features/scheduling/types';

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CreateBookingRequest }) =>
      schedulingApi.rescheduleBooking(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsKeys.list() });
    },
  });
}
