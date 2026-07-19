'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { paymentKeys } from '@/features/payment/hooks/query-keys';
import type { Money, PaymentMethod } from '@/features/payment/api/types';

export interface InitiateChargeInput {
  amount: Money;
  paymentMethod: PaymentMethod;
  paymentMethodToken: string;
}

/**
 * A stable idempotencyKey per consultationSessionId, generated once and
 * reused across every retry of the same "click Pay" action -- a network
 * timeout retry then safely replays the original outcome instead of
 * risking a double charge (matches the backend's own idempotency-key
 * contract, InitiateChargeUseCase).
 */
export function useInitiateCharge(consultationSessionId: string) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  return useMutation({
    mutationFn: (input: InitiateChargeInput) =>
      paymentApi.initiateCharge({
        idempotencyKey: idempotencyKeyRef.current,
        consultationSessionId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        paymentMethodToken: input.paymentMethodToken,
      }),
    onSuccess: (transaction) => {
      queryClient.setQueryData(paymentKeys.detail(transaction.id), transaction);
    },
  });
}
