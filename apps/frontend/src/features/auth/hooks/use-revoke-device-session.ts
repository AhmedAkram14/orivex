'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { DeviceSession } from '@/features/auth/api/types';
import { deviceSessionKeys } from '@/features/auth/hooks/query-keys';

interface RevokeContext {
  previousSessions?: DeviceSession[];
}

/**
 * Revokes a single device's session (not the current one — the Security
 * Center hides the "revoke" action for `isCurrent`, since ending your own
 * session belongs to Logout instead).
 *
 * Optimistic: the row disappears from the list immediately on click rather
 * than waiting for the round-trip, then rolls back to the exact
 * pre-mutation snapshot if the request fails. This is the first optimistic
 * mutation in this feature (every other auth mutation here waits for the
 * server before updating the cache) — kept as a clean, standard TanStack
 * Query shape (cancel in-flight queries, snapshot, write, roll back on
 * error, reconcile via invalidation once settled) for future mutations in
 * this codebase to copy.
 */
export function useRevokeDeviceSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeDeviceSession(sessionId),
    onMutate: async (sessionId: string): Promise<RevokeContext> => {
      await queryClient.cancelQueries({ queryKey: deviceSessionKeys.all });
      const previousSessions = queryClient.getQueryData<DeviceSession[]>(deviceSessionKeys.list());
      if (previousSessions) {
        queryClient.setQueryData<DeviceSession[]>(
          deviceSessionKeys.list(),
          previousSessions.filter((session) => session.id !== sessionId),
        );
      }
      return { previousSessions };
    },
    onError: (_error, _sessionId, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(deviceSessionKeys.list(), context.previousSessions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deviceSessionKeys.all });
    },
  });
}
