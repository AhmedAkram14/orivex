'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorAvailabilityKeys } from '@/features/doctor/hooks/query-keys';

export function useDoctorAvailability() {
  return useQuery({
    queryKey: doctorAvailabilityKeys.list(),
    queryFn: () => doctorApi.getWeeklyAvailability(),
  });
}
