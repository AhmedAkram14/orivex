'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorUpcomingWorkKeys } from '@/features/doctor/hooks/query-keys';

export function useDoctorUpcomingWork(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: doctorUpcomingWorkKeys.list(),
    queryFn: () => doctorApi.getUpcomingWork(),
    enabled: options?.enabled,
  });
}
