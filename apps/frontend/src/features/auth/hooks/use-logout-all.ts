'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { sessionKeys, deviceSessionKeys } from '@/features/auth/hooks/query-keys';
import { tokenStorage } from '@/shared/auth/token-storage';

/** Logout All Devices — ends every session, including this one, so the local state is cleared exactly like a normal logout. */
export function useLogoutAllDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logoutAllDevices(),
    onSuccess: () => {
      tokenStorage.clear();
      queryClient.setQueryData(sessionKeys.detail('current'), null);
      queryClient.invalidateQueries({ queryKey: deviceSessionKeys.all });
    },
  });
}
