'use client';

import { useQuery } from '@tanstack/react-query';
import { landingApi } from '@/features/landing/api/landing-api';
import { landingDoctorsKeys } from '@/features/landing/hooks/query-keys';

/** No auth header required. Defaults to a small page for the landing page's "Popular Doctors" section — see ListPublicDoctorsUseCase's own comment on why ranking is only honest at a small, single-page scale. */
export function usePublicDoctors(params: { specialtyId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: landingDoctorsKeys.list(params),
    queryFn: () => landingApi.getDoctors({ specialtyId: params.specialtyId, limit: params.limit ?? 6 }),
  });
}
