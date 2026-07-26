'use client';

import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '@/features/reference/api/reference-api';
import { referenceInsuranceProvidersKeys } from '@/features/reference/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.7): the Patient Medical Profile editor's insurance provider dropdown. */
export function useInsuranceProvidersList() {
  return useQuery({
    queryKey: referenceInsuranceProvidersKeys.lists(),
    queryFn: () => referenceApi.listInsuranceProviders(),
  });
}
