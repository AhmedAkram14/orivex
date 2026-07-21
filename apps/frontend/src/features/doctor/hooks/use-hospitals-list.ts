'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorHospitalsKeys } from '@/features/doctor/hooks/query-keys';

/** Doctor Onboarding (Phase 4 continuation): the hospital picker's data source -- the public /hospitals directory, not the SuperAdmin-only /admin/hospitals. */
export function useHospitalsList() {
  return useQuery({
    queryKey: doctorHospitalsKeys.lists(),
    queryFn: () => doctorApi.listHospitals(),
  });
}
