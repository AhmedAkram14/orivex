'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorPatientChartProfileKeys } from '@/features/doctor/hooks/query-keys';

/**
 * Doctor Patient Chart Phase 4.3: the doctor-write path into PatientModule's
 * `allergiesConfirmedNoneAt`. The backend rejects (422) if `allergies` is
 * already a non-empty positive record -- this route only ever sets
 * "confirmed none," never overwrites a real allergy.
 */
export function useConfirmNoKnownAllergies(patientProfileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => doctorApi.confirmNoKnownAllergies(patientProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorPatientChartProfileKeys.detail(patientProfileId) });
    },
  });
}
