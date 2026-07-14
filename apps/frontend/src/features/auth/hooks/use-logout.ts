'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { sessionKeys } from '@/features/auth/hooks/query-keys';
import { tokenStorage } from '@/shared/auth/token-storage';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      tokenStorage.clear();
      queryClient.setQueryData(sessionKeys.detail('current'), null);
    },
  });
}
