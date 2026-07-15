'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientPrescriptionsKeys } from '@/features/patient/hooks/query-keys';

export function usePatientPrescriptions() {
  return useQuery({
    queryKey: patientPrescriptionsKeys.list(),
    queryFn: () => patientApi.getPrescriptions(),
  });
}
