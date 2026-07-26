'use client';

import { useQuery } from '@tanstack/react-query';
import { identityApi } from '@/features/identity/api/identity-api';
import { accountKeys } from '@/features/identity/hooks/query-keys';

/** Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): SuperAdmin-only account lookup, backing the verification case-detail page's "Applicant" section. */
export function useAccountById(accountId: string | undefined) {
  return useQuery({
    queryKey: accountKeys.detail(accountId ?? 'none'),
    queryFn: () => identityApi.getAccountById(accountId as string),
    enabled: Boolean(accountId),
  });
}
