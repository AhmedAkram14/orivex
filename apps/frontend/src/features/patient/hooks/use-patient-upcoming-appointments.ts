'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientUpcomingAppointmentsKeys } from '@/features/patient/hooks/query-keys';

export function usePatientUpcomingAppointments() {
  return useQuery({
    queryKey: patientUpcomingAppointmentsKeys.list(),
    queryFn: () => patientApi.getUpcomingAppointments(),
  });
}
