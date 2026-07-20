'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminSecurityEventsKeys } from '@/features/admin/hooks/query-keys';

export function useSecurityEventsForAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: adminSecurityEventsKeys.detail(accountId ?? 'none'),
    queryFn: () => adminApi.getSecurityEventsForAccount(accountId as string),
    enabled: Boolean(accountId),
  });
}
