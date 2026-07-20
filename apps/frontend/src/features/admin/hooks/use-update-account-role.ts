'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminAccountsKeys, platformKpisKeys } from '@/features/admin/hooks/query-keys';
import type { Role } from '@/shared/auth/types';

export function useUpdateAccountRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, role }: { accountId: string; role: Role }) =>
      adminApi.updateAccountRole(accountId, role),
    onSuccess: () => {
      // A role change can move an account in/out of the doctor/patient
      // counts the KPI tiles show, not just the accounts list itself.
      queryClient.invalidateQueries({ queryKey: adminAccountsKeys.all });
      queryClient.invalidateQueries({ queryKey: platformKpisKeys.all });
    },
  });
}
