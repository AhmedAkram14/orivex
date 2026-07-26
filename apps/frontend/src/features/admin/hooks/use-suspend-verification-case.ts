'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';
import type { SuspendVerificationCaseRequest } from '@/features/admin/api/types';

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
 * O.2 suspend capability (Approved -> Suspended only, reason required),
 * finally wired to a real admin UI action.
 */
export function useSuspendVerificationCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: SuspendVerificationCaseRequest }) =>
      adminApi.suspendVerificationCase(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminVerificationQueueKeys.all });
    },
  });
}
