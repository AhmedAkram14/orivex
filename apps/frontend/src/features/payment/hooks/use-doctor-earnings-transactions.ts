'use client';

import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { doctorEarningsTransactionsKeys } from '@/features/payment/hooks/query-keys';
import type { DoctorEarningsFilterParams } from '@/features/payment/api/types';

/**
 * Doctor Earnings page rebuild (Phase 3) -- backs the per-consultation
 * drill-down table below the cycles section. Scoped to the selected date
 * range, returned across ALL statuses (including `refunded`), unlike the
 * summary's lifetime/cycle figures. `filter` is part of the query key so
 * changing the date range refetches, mirroring `useDoctorEarningsSummary`.
 */
export function useDoctorEarningsTransactions(filter?: DoctorEarningsFilterParams) {
  return useQuery({
    queryKey: doctorEarningsTransactionsKeys.list(filter ?? {}),
    queryFn: () => paymentApi.getDoctorEarningsTransactions(filter),
  });
}
