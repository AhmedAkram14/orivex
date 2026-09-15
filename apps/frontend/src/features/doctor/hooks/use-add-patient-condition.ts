'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorPatientChartMedicalRecordsKeys } from '@/features/doctor/hooks/query-keys';

/**
 * Doctor Patient Chart Phase 4.1: adds a doctor-authored condition directly
 * from the chart's Medical History tab (no consultation session involved).
 * On success, invalidates that patient's medical-records query -- the new
 * condition appears via `DoctorPatientChartController.getMedicalRecords()`'s
 * existing Condition-node filter, no other cache needs touching.
 */
export function useAddPatientCondition(patientProfileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      freeTextDescription,
      certaintyLevel,
    }: {
      freeTextDescription: string;
      certaintyLevel?: 'suspected' | 'confirmed' | 'ruled_out';
    }) => doctorApi.addPatientCondition(patientProfileId, freeTextDescription, certaintyLevel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorPatientChartMedicalRecordsKeys.detail(patientProfileId) });
    },
  });
}
