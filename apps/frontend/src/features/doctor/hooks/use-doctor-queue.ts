'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorQueueKeys } from '@/features/doctor/hooks/query-keys';

export function useDoctorQueue() {
  return useQuery({
    queryKey: doctorQueueKeys.list(),
    queryFn: () => doctorApi.getQueue(),
  });
}
