'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { bookingsKeys } from '@/features/scheduling/hooks/query-keys';
import type { CreateBookingRequest } from '@/features/scheduling/types';

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateBookingRequest) => schedulingApi.createBooking(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsKeys.list() });
    },
  });
}
