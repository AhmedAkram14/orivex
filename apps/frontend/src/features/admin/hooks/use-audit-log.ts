'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminAuditLogKeys } from '@/features/admin/hooks/query-keys';
import type { ListAuditLogParams } from '@/features/admin/api/types';

/** I11 -- Admin audit-log viewer: the real, cross-account PHI/clinical audit feed. */
export function useAuditLog(params: ListAuditLogParams) {
  return useQuery({
    queryKey: adminAuditLogKeys.list(params),
    queryFn: () => adminApi.getAuditLog(params),
  });
}
