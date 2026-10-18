'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminAccountsKeys } from '@/features/admin/hooks/query-keys';
import type { Role } from '@/shared/auth/types';

export function useUpdateAccountRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, role }: { accountId: string; role: Role }) =>
      adminApi.updateAccountRole(accountId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminAccountsKeys.all });
    },
  });
}
