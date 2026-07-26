'use client';

import { useQuery } from '@tanstack/react-query';
import { referenceApi } from '@/features/reference/api/reference-api';
import { referenceSpecialtiesKeys } from '@/features/reference/hooks/query-keys';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Browse Specialties screen's data source. */
export function useSpecialtiesList() {
  return useQuery({
    queryKey: referenceSpecialtiesKeys.lists(),
    queryFn: () => referenceApi.listSpecialties(),
  });
}
