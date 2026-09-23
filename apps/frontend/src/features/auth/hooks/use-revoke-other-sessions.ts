'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { deviceSessionKeys } from '@/features/auth/hooks/query-keys';

/** "Sign out all other devices" -- keeps the caller's own current session alive, unlike useLogoutAllDevices. */
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceSessionKeys.all });
    },
  });
}
