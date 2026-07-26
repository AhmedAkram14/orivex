'use client';

import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '@/features/reference/api/reference-api';
import { referenceCountriesKeys } from '@/features/reference/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.6): the shared Personal Info step's nationality dropdown. */
export function useCountriesList() {
  return useQuery({
    queryKey: referenceCountriesKeys.lists(),
    queryFn: () => referenceApi.listCountries(),
  });
}
