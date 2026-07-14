'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { ForgotPasswordRequest } from '@/features/auth/api/types';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (request: ForgotPasswordRequest) => authApi.forgotPassword(request),
  });
}
