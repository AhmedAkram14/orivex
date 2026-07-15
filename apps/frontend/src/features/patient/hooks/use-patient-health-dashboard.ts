'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientHealthDashboardKeys } from '@/features/patient/hooks/query-keys';

export function usePatientHealthDashboard() {
  return useQuery({
    queryKey: patientHealthDashboardKeys.list(),
    queryFn: () => patientApi.getHealthDashboard(),
  });
}
