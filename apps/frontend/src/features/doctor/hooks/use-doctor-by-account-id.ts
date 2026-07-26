'use client';

import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorDirectoryKeys } from '@/features/doctor/hooks/query-keys';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
 * SuperAdmin-only lookup, backing the verification case-detail page's
 * Doctor-specific context section. `enabled` lets the caller gate this on
 * `subjectType === 'doctor'`.
 */
export function useDoctorByAccountId(accountId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: doctorDirectoryKeys.detail(`account-${accountId ?? 'none'}`),
    queryFn: () => doctorApi.getByAccountId(accountId as string),
    enabled: enabled && Boolean(accountId),
    retry: false,
  });
}
