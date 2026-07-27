'use client';

import { useQuery } from '@tanstack/react-query';
import { consultationApi } from '@/features/consultation/api/consultation-api';
import { consultationSummaryKeys } from '@/features/consultation/hooks/query-keys';

/** Backs both the doctor's wrap-up view and the patient's post-consultation summary -- same shape, same endpoint. */
export function useConsultationSummary(consultationSessionId: string | undefined) {
  return useQuery({
    queryKey: consultationSummaryKeys.detail(consultationSessionId ?? ''),
    queryFn: () => consultationApi.getSummary(consultationSessionId!),
    enabled: Boolean(consultationSessionId),
  });
}
