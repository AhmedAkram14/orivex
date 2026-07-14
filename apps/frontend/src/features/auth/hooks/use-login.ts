'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import { sessionKeys } from '@/features/auth/hooks/query-keys';
import type { LoginRequest } from '@/features/auth/api/types';
import { tokenStorage } from '@/shared/auth/token-storage';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => authApi.login(request),
    onSuccess: (response) => {
      tokenStorage.setAccessToken(response.accessToken, response.accessTokenExpiresAt);
      queryClient.setQueryData(sessionKeys.detail('current'), response.user);
    },
  });
}
