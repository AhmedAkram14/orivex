'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/features/scheduling/api/scheduling-api';
import { schedulingRulesKeys } from '@/features/scheduling/hooks/query-keys';

export function useSchedulingRules() {
  return useQuery({
    queryKey: schedulingRulesKeys.detail('current'),
    queryFn: () => schedulingApi.getRules(),
  });
}
