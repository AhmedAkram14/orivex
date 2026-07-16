'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { holidaysKeys } from '@/features/scheduling/hooks/query-keys';

export function useHolidays() {
  return useQuery({
    queryKey: holidaysKeys.list(),
    queryFn: () => schedulingApi.getHolidays(),
  });
}
