'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulingApi, type AddScheduleExceptionRequest } from '@/features/scheduling/api/scheduling-api';
import { doctorExceptionsKeys } from '@/features/scheduling/hooks/query-keys';

export function useAddDoctorException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddScheduleExceptionRequest) => schedulingApi.addDoctorException(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorExceptionsKeys.list() });
    },
  });
}
