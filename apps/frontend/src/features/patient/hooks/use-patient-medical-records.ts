'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientMedicalRecordsKeys } from '@/features/patient/hooks/query-keys';

export function usePatientMedicalRecords() {
  return useQuery({
    queryKey: patientMedicalRecordsKeys.list(),
    queryFn: () => patientApi.getMedicalRecords(),
  });
}
