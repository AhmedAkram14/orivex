'use client';

import { useQuery } from '@tanstack/react-query';
import { landingApi } from '@/features/landing/api/landing-api';
import { landingSpecialtiesKeys } from '@/features/landing/hooks/query-keys';

/** No auth header required — reachable before login, which is the whole point of the landing page. */
export function usePublicSpecialties() {
  return useQuery({
    queryKey: landingSpecialtiesKeys.all,
    queryFn: () => landingApi.getSpecialties(),
  });
}
