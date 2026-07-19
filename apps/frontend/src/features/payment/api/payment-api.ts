import { apiFetch } from '@/shared/lib/api/client';
import { PAYMENT_PATHS } from '@/features/payment/api/paths';
import type { InitiateChargeRequest, PaymentTransaction } from '@/features/payment/api/types';

/**
 * The only module that talks to `/payments/*` — mirrors `notificationsApi`'s
 * shape: thin typed wrappers over `apiFetch`, no logic of their own.
 * Real backend endpoints (PaymentModule's PaymentController, ORIVEX
 * Roadmap 2.0 Stage 1).
 */
export const paymentApi = {
  initiateCharge: (request: InitiateChargeRequest) =>
    apiFetch<PaymentTransaction>({ method: 'POST', path: PAYMENT_PATHS.initiateCharge, body: request }),

  getById: (id: string) => apiFetch<PaymentTransaction>({ path: PAYMENT_PATHS.getById(id) }),

  /** Doctor-only — null when the session has no charge attempt yet (e.g. a Free consultation, or a Paid one still awaiting payment). */
  getByConsultationSessionId: (consultationSessionId: string) =>
    apiFetch<PaymentTransaction | null>({ path: PAYMENT_PATHS.getByConsultationSessionId(consultationSessionId) }),

  refund: (id: string) => apiFetch<PaymentTransaction>({ method: 'POST', path: PAYMENT_PATHS.refund(id) }),
};
