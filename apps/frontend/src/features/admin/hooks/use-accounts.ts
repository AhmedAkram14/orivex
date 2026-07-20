'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminAccountsKeys } from '@/features/admin/hooks/query-keys';
import type { ListAccountsParams } from '@/features/admin/api/types';

export function useAccounts(params: ListAccountsParams) {
  return useQuery({
    queryKey: adminAccountsKeys.list(params),
    queryFn: () => adminApi.listAccounts(params),
  });
}
