'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { authApi } from '@/features/auth/api/auth-api';
import type { ChangePasswordRequest } from '@/features/auth/api/types';
import { toast } from '@/shared/ui/use-toast';

/**
 * Doctor Settings Rebuild, Phase 5: backs `ChangePasswordForm`, calling the
 * real, already-existing `POST /auth/change-password` (JwtAuthGuard-
 * protected; ChangePasswordUseCase) -- this closes a real gap where a
 * fully-built backend feature had zero frontend surface. A success toast
 * fires here (matches `useUpdateNotificationPreferences`'s own explicit
 * onSuccess-toast convention); a failure is left for the form itself to
 * render inline, since a wrong-current-password error benefits from a
 * clearer, form-specific message than a generic toast would give it.
 */
export function useChangePassword() {
  const t = useTranslations('auth.changePassword');

  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => authApi.changePassword(request),
    onSuccess: () => {
      toast({ description: t('saveSuccess'), variant: 'success' });
    },
  });
}
