'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { deviceSessionKeys } from '@/features/auth/hooks/query-keys';

/** Revokes a single device's session (not the current one — the Security Center hides the "revoke" action for `isCurrent`, since ending your own session belongs to Logout instead). */
export function useRevokeDeviceSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeDeviceSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceSessionKeys.all });
    },
  });
}
