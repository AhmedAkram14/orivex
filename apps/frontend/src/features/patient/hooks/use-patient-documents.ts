'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientDocumentsKeys } from '@/features/patient/hooks/query-keys';

/** The patient's own clinical documents, newest first (the server's order). */
export function usePatientDocuments() {
  return useQuery({
    queryKey: patientDocumentsKeys.list(),
    queryFn: () => patientApi.getDocuments(),
  });
}
