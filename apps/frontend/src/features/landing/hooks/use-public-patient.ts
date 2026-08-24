'use client';

import { useQuery } from '@tanstack/react-query';
import { landingApi } from '@/features/landing/api/landing-api';
import { publicPatientKeys } from '@/features/landing/hooks/query-keys';

/** No auth header required -- backs the public patient profile page a review links to. */
export function usePublicPatient(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: publicPatientKeys.detail(patientProfileId ?? ''),
    queryFn: () => landingApi.getPatient(patientProfileId!),
    enabled: Boolean(patientProfileId),
  });
}
