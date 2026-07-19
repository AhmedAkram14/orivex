import type { PaymentTransaction } from '../entities/payment-transaction.entity.js';

export interface PaymentTransactionRepository {
  findById(id: string): Promise<PaymentTransaction | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null>;
  // Backs the Stripe webhook receiver: matches an inbound event back to the
  // transaction that created it via the gateway's own reference.
  findByExternalReference(externalReference: string): Promise<PaymentTransaction | null>;
  save(transaction: PaymentTransaction): Promise<void>;
}
