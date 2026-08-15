import type { PaymentTransaction } from '../entities/payment-transaction.entity.js';

export interface PaymentTransactionRepository {
  findById(id: string): Promise<PaymentTransaction | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null>;
  // Backs the Stripe webhook receiver: matches an inbound event back to the
  // transaction that created it via the gateway's own reference.
  findByExternalReference(externalReference: string): Promise<PaymentTransaction | null>;
  // Backs the doctor-facing "refund this consultation's payment" action
  // (ORIVEX Roadmap 2.0 Stage 1) -- lets the frontend discover a
  // transaction id to refund from a consultation session id it already
  // has, without PaymentModule needing to expose a raw list/search
  // endpoint. At most one transaction ever exists per session today
  // (InitiateChargeUseCase's idempotency key is scoped per charge attempt,
  // but a session is only ever charged once in the current flow).
  findByConsultationSessionId(consultationSessionId: string): Promise<PaymentTransaction | null>;
  // Backs the appointment-cancellation auto-refund handler -- looks up
  // a transaction by appointmentId directly, since that's the real join key
  // from the moment a charge is initiated (pay-then-confirm; see
  // InitiateTransactionProps), independent of whether a ConsultationSession
  // ever existed for this appointment.
  findByAppointmentId(appointmentId: string): Promise<PaymentTransaction | null>;
  save(transaction: PaymentTransaction): Promise<void>;
  // Backs the SuperAdmin-facing "list payment transactions" read (ORIVEX
  // Roadmap Phase 3, Critical Lifecycle Gaps, Step 4) -- newest first, same
  // page/offset + total-count shape as AccountRepository.findAll (Stage 4's
  // established admin-list pagination contract).
  findAll(options: { limit: number; offset: number }): Promise<{ transactions: PaymentTransaction[]; total: number }>;
}
