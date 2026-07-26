'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientIdentityVerificationStatusKeys, patientVerificationsKeys } from '@/features/patient/hooks/query-keys';
import type { SubmitPatientVerificationRequest } from '@/features/patient/api/types';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.7): submits (or resubmits, after a rejection) for review -- POST /patients/:id/verifications, reused as-is from Doctor's own pattern. */
export function useSubmitPatientVerification(patientProfileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SubmitPatientVerificationRequest) => patientApi.submitVerification(patientProfileId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientVerificationsKeys.detail(patientProfileId) });
      queryClient.invalidateQueries({ queryKey: patientIdentityVerificationStatusKeys.detail('current') });
    },
  });
}
