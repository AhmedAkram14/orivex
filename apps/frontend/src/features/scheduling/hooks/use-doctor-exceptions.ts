'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { doctorExceptionsKeys } from '@/features/scheduling/hooks/query-keys';

export function useDoctorExceptions() {
  return useQuery({
    queryKey: doctorExceptionsKeys.list(),
    queryFn: () => schedulingApi.getDoctorExceptions(),
  });
}
