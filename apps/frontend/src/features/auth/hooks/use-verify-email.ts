'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { VerifyEmailRequest } from '@/features/auth/api/types';

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (request: VerifyEmailRequest) => authApi.verifyEmail(request),
  });
}
