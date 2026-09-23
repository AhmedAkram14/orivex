'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { LoginHistoryQuery } from '@/features/auth/api/types';
import { loginHistoryKeys } from '@/features/auth/hooks/query-keys';

export function useLoginHistory(params: LoginHistoryQuery) {
  return useQuery({
    queryKey: loginHistoryKeys.list(params),
    queryFn: () => authApi.getLoginHistory(params),
    placeholderData: (previousData) => previousData,
  });
}
