'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): every
 * past VerificationCase submitted by the same subject as the given case id
 * -- the applicant's full submission history (resubmission after rejection
 * creates a new case row rather than mutating the old one).
 */
export function useVerificationCaseHistory(id: string) {
  return useQuery({
    queryKey: adminVerificationQueueKeys.detail(`${id}-history`),
    queryFn: () => adminApi.getVerificationCaseHistory(id),
  });
}
