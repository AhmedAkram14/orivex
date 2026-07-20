'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminFeatureFlagsKeys } from '@/features/admin/hooks/query-keys';

export function useAdminFeatureFlags() {
  return useQuery({
    queryKey: adminFeatureFlagsKeys.detail('current'),
    queryFn: () => adminApi.getFeatureFlags(),
  });
}
