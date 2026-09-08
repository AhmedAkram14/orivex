'use client';

import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { doctorEarningsSummaryKeys } from '@/features/payment/hooks/query-keys';

/** I2 -- Doctor earnings dashboard (docs/01-prd.md L15, L94 §2.10). `month` is an optional "YYYY-MM" filter for the cycle breakdown. */
export function useDoctorEarningsSummary(month?: string) {
  return useQuery({
    queryKey: doctorEarningsSummaryKeys.detail(month ?? 'all'),
    queryFn: () => paymentApi.getDoctorEarningsSummary(month),
  });
}
