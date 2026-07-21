'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorProfileKeys } from '@/features/doctor/hooks/query-keys';
import type { RegisterDoctorProfileRequest } from '@/features/doctor/api/types';

/** Doctor Onboarding (Phase 4 continuation): the "Create DoctorProfile" step -- POST /doctors, real and reachable by a still-Patient applicant. */
export function useRegisterDoctorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RegisterDoctorProfileRequest) => doctorApi.registerProfile(request),
    onSuccess: (profile) => {
      queryClient.setQueryData(doctorProfileKeys.detail('current'), profile);
    },
  });
}
