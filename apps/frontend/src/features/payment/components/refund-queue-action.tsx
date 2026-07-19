'use client';

import { usePaymentByConsultationSession } from '@/features/payment/hooks/use-payment-by-consultation-session';
import { RefundButton } from '@/features/payment/components/refund-button';

export interface RefundQueueActionProps {
  /** The Doctor Queue's real per-entry id, which is the consultation session id (QueueEntryResponseDto.id). */
  consultationSessionId: string;
}

const REFUNDABLE_STATUSES = new Set(['succeeded', 'settled']);

/**
 * The reachable entry point into the refund flow (ORIVEX Roadmap 2.0 Stage
 * 1) — renders on a completed Doctor Queue entry, discovers whether that
 * consultation has a refundable payment, and shows the real refund action
 * only when one exists. Renders nothing for a Free consultation, an
 * unpaid one, or one already refunded/disputed — never a fabricated action
 * on data that isn't there.
 */
export function RefundQueueAction({ consultationSessionId }: RefundQueueActionProps) {
  const { data: transaction, isLoading } = usePaymentByConsultationSession(consultationSessionId);

  if (isLoading || !transaction || !REFUNDABLE_STATUSES.has(transaction.status)) {
    return null;
  }

  return <RefundButton paymentTransactionId={transaction.id} />;
}
