'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { loginHistoryKeys } from '@/features/auth/hooks/query-keys';

export function useLoginHistory() {
  return useQuery({
    queryKey: loginHistoryKeys.list(),
    queryFn: () => authApi.getLoginHistory(),
  });
}
