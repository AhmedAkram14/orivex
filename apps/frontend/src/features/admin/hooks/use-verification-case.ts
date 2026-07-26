'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';

/** Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the verification case-detail page's data source. */
export function useVerificationCase(id: string) {
  return useQuery({
    queryKey: adminVerificationQueueKeys.detail(id),
    queryFn: () => adminApi.getVerificationCase(id),
  });
}
