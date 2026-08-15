'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminPaymentsKeys } from '@/features/admin/hooks/query-keys';
import type { ListAdminPaymentTransactionsParams } from '@/features/admin/api/types';

export function useAdminPayments(params: ListAdminPaymentTransactionsParams) {
  return useQuery({
    queryKey: adminPaymentsKeys.list(params),
    queryFn: () => adminApi.listPayments(params),
  });
}
