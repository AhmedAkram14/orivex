'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';

export function useVerificationQueue() {
  return useQuery({
    queryKey: adminVerificationQueueKeys.lists(),
    queryFn: () => adminApi.getVerificationQueue(),
  });
}
