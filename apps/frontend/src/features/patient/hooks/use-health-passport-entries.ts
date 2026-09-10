'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { healthPassportEntriesKeys } from '@/features/patient/hooks/query-keys';

/** I6 -- Health Passport. */
export function useHealthPassportEntries() {
  return useQuery({
    queryKey: healthPassportEntriesKeys.detail('current'),
    queryFn: () => patientApi.listHealthPassportEntries(),
  });
}
