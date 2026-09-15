'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientAppointmentsKeys } from '@/features/patient/hooks/query-keys';

export function usePatientAppointments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: patientAppointmentsKeys.list(),
    queryFn: () => patientApi.getAppointments(),
    enabled: options?.enabled,
  });
}
