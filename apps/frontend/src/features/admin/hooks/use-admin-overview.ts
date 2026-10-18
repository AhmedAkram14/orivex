'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminOverviewKeys } from '@/features/admin/hooks/query-keys';

/** `GET /admin/overview` -- the work queues and health strip on the admin Overview, refreshed every minute while it is open. */
export function useAdminOverview() {
  return useQuery({
    queryKey: adminOverviewKeys.detail('current'),
    queryFn: () => adminApi.getOverview(),
    refetchInterval: 60_000,
  });
}
