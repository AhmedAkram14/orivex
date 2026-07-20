'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { platformKpisKeys } from '@/features/admin/hooks/query-keys';

export function usePlatformKpis() {
  return useQuery({
    queryKey: platformKpisKeys.detail('current'),
    queryFn: () => adminApi.getKpis(),
  });
}
