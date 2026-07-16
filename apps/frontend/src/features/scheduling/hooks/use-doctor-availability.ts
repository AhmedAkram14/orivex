'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { doctorAvailabilityKeys } from '@/features/scheduling/hooks/query-keys';

export function useDoctorAvailability() {
  return useQuery({
    queryKey: doctorAvailabilityKeys.detail('current'),
    queryFn: () => schedulingApi.getDoctorAvailability(),
  });
}
