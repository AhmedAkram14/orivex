'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { securitySummaryKeys } from '@/features/auth/hooks/query-keys';

export function useSecuritySummary() {
  return useQuery({
    queryKey: securitySummaryKeys.detail('current'),
    queryFn: () => authApi.getSecuritySummary(),
  });
}
