'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientIdentityVerificationStatusKeys } from '@/features/patient/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the UX-convenience check backing the "Verify your identity to continue" gate -- lets a gated action's UI show the prompt pre-emptively, before ever hitting the real 403. */
export function useIdentityVerificationStatus() {
  return useQuery({
    queryKey: patientIdentityVerificationStatusKeys.detail('current'),
    queryFn: () => patientApi.getMyIdentityVerificationStatus(),
  });
}
