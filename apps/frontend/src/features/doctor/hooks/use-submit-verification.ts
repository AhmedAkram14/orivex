'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorVerificationsKeys } from '@/features/doctor/hooks/query-keys';
import type { SubmitVerificationRequest } from '@/features/doctor/api/types';

/** Doctor Onboarding (Phase 4 continuation): submits (or resubmits, after a rejection) for review -- POST /doctors/:id/verifications, reused as-is. */
export function useSubmitVerification(doctorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SubmitVerificationRequest) => doctorApi.submitVerification(doctorId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorVerificationsKeys.detail(doctorId) });
    },
  });
}
