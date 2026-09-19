'use client';

import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { doctorEarningsSummaryKeys } from '@/features/payment/hooks/query-keys';
import type { DoctorEarningsFilterParams } from '@/features/payment/api/types';

/**
 * I2 -- Doctor earnings dashboard (docs/01-prd.md L15, L94 §2.10).
 * `filter` scopes the cycle breakdown only -- the response's `lifetime*`
 * fields are always computed across the doctor's full, unfiltered ledger
 * server-side (Doctor Earnings page rebuild, Phase 0 fix), so this single
 * hook call safely serves both the always-lifetime tiles and the
 * range-scoped cycles table (plan decision 7) without a second unfiltered
 * call. `filter` is part of the query key so changing the date range
 * refetches instead of showing stale cycles.
 */
export function useDoctorEarningsSummary(filter?: DoctorEarningsFilterParams) {
  return useQuery({
    queryKey: doctorEarningsSummaryKeys.list(filter ?? {}),
    queryFn: () => paymentApi.getDoctorEarningsSummary(filter),
  });
}
