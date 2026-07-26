'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import type { VerificationQueueParams } from '@/features/admin/api/types';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';

/** Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): subjectType/status are real, server-side query filters -- never filtered client-side. */
export function useVerificationQueue(params: VerificationQueueParams = {}) {
  return useQuery({
    queryKey: adminVerificationQueueKeys.list(params),
    queryFn: () => adminApi.getVerificationQueue(params),
  });
}
