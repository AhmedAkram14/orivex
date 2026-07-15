'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientProfileKeys } from '@/features/patient/hooks/query-keys';
import type { PatientProfileUpdateRequest } from '@/features/patient/api/types';

export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PatientProfileUpdateRequest) => patientApi.updateProfile(request),
    onSuccess: (profile) => {
      queryClient.setQueryData(patientProfileKeys.detail('current'), profile);
    },
  });
}
