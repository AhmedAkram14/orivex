'use client';

import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/features/patient/api/patient-api';
import { patientVerificationsKeys } from '@/features/patient/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.7): the applicant's own identity-verification status/history, most-recently-submitted-first. */
export function useMyPatientVerifications(patientProfileId: string | undefined) {
  return useQuery({
    queryKey: patientVerificationsKeys.detail(patientProfileId ?? 'none'),
    queryFn: () => patientApi.listVerifications(patientProfileId as string),
    enabled: Boolean(patientProfileId),
  });
}
