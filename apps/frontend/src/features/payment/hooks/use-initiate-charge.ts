'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { paymentKeys } from '@/features/payment/hooks/query-keys';
import type { Money, PaymentMethod } from '@/features/payment/api/types';
import { patientAppointmentsKeys } from '@/features/patient/hooks/query-keys';

export interface InitiateChargeInput {
  amount: Money;
  paymentMethod: PaymentMethod;
  paymentMethodToken: string;
}

/**
 * A stable idempotencyKey per appointmentId, generated once and reused
 * across every retry of the same "click Pay" action -- a network timeout
 * retry then safely replays the original outcome instead of risking a
 * double charge (matches the backend's own idempotency-key contract,
 * InitiateChargeUseCase).
 *
 * Consultation Pricing Lifecycle Completion (pay-then-confirm): charges
 * against the Appointment directly, not a ConsultationSession -- no session
 * exists yet at charge time (pay-then-confirm; one is only opened once this
 * charge succeeds).
 */
export function useInitiateCharge(appointmentId: string) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  return useMutation({
    mutationFn: (input: InitiateChargeInput) =>
      paymentApi.initiateCharge({
        idempotencyKey: idempotencyKeyRef.current,
        appointmentId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        paymentMethodToken: input.paymentMethodToken,
      }),
    onSuccess: (transaction) => {
      queryClient.setQueryData(paymentKeys.detail(transaction.id), transaction);
      // A successful charge confirms the appointment server-side
      // (InitiateChargeUseCase -> ConfirmAppointmentUseCase) -- refetch so
      // paymentRequired/status flip in the UI without a manual reload.
      queryClient.invalidateQueries({ queryKey: patientAppointmentsKeys.all });
    },
  });
}
