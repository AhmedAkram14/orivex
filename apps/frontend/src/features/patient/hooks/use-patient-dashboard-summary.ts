'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientDashboardKeys } from '@/features/patient/hooks/query-keys';

export function usePatientDashboardSummary() {
  return useQuery({
    queryKey: patientDashboardKeys.list(),
    queryFn: () => patientApi.getDashboardSummary(),
  });
}
