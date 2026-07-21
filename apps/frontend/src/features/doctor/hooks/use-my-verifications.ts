'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorVerificationsKeys } from '@/features/doctor/hooks/query-keys';

/** Doctor Onboarding (Phase 4 continuation): the applicant's own verification status/history, most-recently-submitted-first. */
export function useMyVerifications(doctorId: string | undefined) {
  return useQuery({
    queryKey: doctorVerificationsKeys.detail(doctorId ?? 'none'),
    queryFn: () => doctorApi.listVerifications(doctorId as string),
    enabled: Boolean(doctorId),
  });
}
