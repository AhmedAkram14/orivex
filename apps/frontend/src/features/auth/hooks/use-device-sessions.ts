'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { deviceSessionKeys } from '@/features/auth/hooks/query-keys';

export function useDeviceSessions() {
  return useQuery({
    queryKey: deviceSessionKeys.list(),
    queryFn: () => authApi.getDeviceSessions(),
  });
}
