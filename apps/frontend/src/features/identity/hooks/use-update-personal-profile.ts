'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { identityApi } from '@/features/identity/api/identity-api';
import { myAccountKeys } from '@/features/identity/hooks/query-keys';
import type { UpdatePersonalProfileRequest } from '@/features/identity/api/types';

export function useUpdatePersonalProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdatePersonalProfileRequest) => identityApi.updateMyPersonalProfile(request),
    onSuccess: (account) => {
      queryClient.setQueryData(myAccountKeys.detail('current'), account);
    },
  });
}
