'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { ResetPasswordRequest } from '@/features/auth/api/types';

export function useResetPassword() {
  return useMutation({
    mutationFn: (request: ResetPasswordRequest) => authApi.resetPassword(request),
  });
}
