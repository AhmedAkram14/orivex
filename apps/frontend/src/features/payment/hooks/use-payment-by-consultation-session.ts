'use client';

import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '@/features/payment/api/payment-api';
import { paymentKeys } from '@/features/payment/hooks/query-keys';

/** Doctor-only — backs the Doctor Queue's refund action, discovering a transaction id from a consultation session id the queue already has. */
export function usePaymentByConsultationSession(consultationSessionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentKeys.detail(`by-session:${consultationSessionId}`),
    queryFn: () => paymentApi.getByConsultationSessionId(consultationSessionId),
    enabled: options?.enabled ?? true,
  });
}
