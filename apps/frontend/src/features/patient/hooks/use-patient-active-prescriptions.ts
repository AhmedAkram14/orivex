'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientActivePrescriptionsKeys } from '@/features/patient/hooks/query-keys';

export function usePatientActivePrescriptions() {
  return useQuery({
    queryKey: patientActivePrescriptionsKeys.list(),
    queryFn: () => patientApi.getActivePrescriptions(),
  });
}
