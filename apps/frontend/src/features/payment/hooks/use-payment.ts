'use client';

import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { paymentKeys } from '@/features/payment/hooks/query-keys';

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ''),
    queryFn: () => paymentApi.getById(id!),
    enabled: Boolean(id),
  });
}
