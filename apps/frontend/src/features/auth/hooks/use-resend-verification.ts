'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { ResendVerificationRequest } from '@/features/auth/api/types';

export function useResendVerification() {
  return useMutation({
    mutationFn: (request: ResendVerificationRequest) => authApi.resendVerification(request),
  });
}
