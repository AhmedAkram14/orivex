'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorProfileKeys } from '@/features/doctor/hooks/query-keys';

export function useDoctorProfile() {
  return useQuery({
    queryKey: doctorProfileKeys.detail('current'),
    queryFn: () => doctorApi.getProfile(),
  });
}
