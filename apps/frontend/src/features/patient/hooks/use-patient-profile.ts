'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientProfileKeys } from '@/features/patient/hooks/query-keys';

export function usePatientProfile() {
  return useQuery({
    queryKey: patientProfileKeys.detail('current'),
    queryFn: () => patientApi.getProfile(),
  });
}
