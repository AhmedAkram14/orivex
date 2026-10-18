'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { adminOverviewKeys, adminPaymentsKeys } from '@/features/admin/hooks/query-keys';

/**
 * SuperAdmin refund mutation -- calls `POST /admin/payments/:id/refund`.
 * Invalidates the payments list (rather than patching the cache directly)
 * because the list row shape (`AdminPaymentTransaction`, with resolved
 * patient/doctor names) differs from the refund response shape (the full
 * `PaymentTransaction`) -- a refetch is the simplest way to keep both
 * correct.
 */
export function useAdminRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentTransactionId: string) => adminApi.refundPayment(paymentTransactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPaymentsKeys.lists() });
      // A refund moves today's revenue on the Overview.
      queryClient.invalidateQueries({ queryKey: adminOverviewKeys.all });
    },
  });
}
