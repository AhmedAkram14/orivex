'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { doctorExceptionsKeys } from '@/features/scheduling/hooks/query-keys';

export function useRemoveDoctorException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulingApi.removeDoctorException(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorExceptionsKeys.list() });
    },
  });
}
