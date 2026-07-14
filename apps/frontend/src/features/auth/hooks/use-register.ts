'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { RegisterRequest } from '@/features/auth/api/types';

/** Registration never authenticates the caller directly — the mock (and real) backend requires email verification first, so this mutation has no session side effect; the register page redirects to Check Email on success. */
export function useRegister() {
  return useMutation({
    mutationFn: (request: RegisterRequest) => authApi.register(request),
  });
}
