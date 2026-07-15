'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorProfileKeys } from '@/features/doctor/hooks/query-keys';
import type { DoctorProfileUpdateRequest } from '@/features/doctor/api/types';

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DoctorProfileUpdateRequest) => doctorApi.updateProfile(request),
    onSuccess: (profile) => {
      queryClient.setQueryData(doctorProfileKeys.detail('current'), profile);
    },
  });
}
