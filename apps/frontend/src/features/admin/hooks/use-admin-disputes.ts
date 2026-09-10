'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminDisputesKeys } from '@/features/admin/hooks/query-keys';

/** I11 -- Admin dispute resolution: the admin queue -- defaults to Open. */
export function useAdminDisputes(status?: 'open' | 'resolved' | 'dismissed') {
  return useQuery({
    queryKey: adminDisputesKeys.list(status ?? 'open'),
    queryFn: () => adminApi.listDisputes(status),
  });
}
