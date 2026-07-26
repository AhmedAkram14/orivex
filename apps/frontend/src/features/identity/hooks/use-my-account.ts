'use client';

import { useQuery } from '@tanstack/react-query';
import { identityApi } from '@/features/identity/api/identity-api';
import { myAccountKeys } from '@/features/identity/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): the shared Personal Info step's data source, for both Doctor Onboarding and (later) the Patient Profile Editor. */
export function useMyAccount() {
  return useQuery({
    queryKey: myAccountKeys.detail('current'),
    queryFn: () => identityApi.getMyAccount(),
  });
}
