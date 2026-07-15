'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorDashboardKeys } from '@/features/doctor/hooks/query-keys';

export function useDoctorDashboardSummary() {
  return useQuery({
    queryKey: doctorDashboardKeys.list(),
    queryFn: () => doctorApi.getDashboardSummary(),
  });
}
