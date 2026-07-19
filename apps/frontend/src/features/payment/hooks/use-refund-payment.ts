'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { paymentKeys } from '@/features/payment/hooks/query-keys';

export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentTransactionId: string) => paymentApi.refund(paymentTransactionId),
    onSuccess: (transaction) => {
      queryClient.setQueryData(paymentKeys.detail(transaction.id), transaction);
    },
  });
}
