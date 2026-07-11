import type { PaymentTransaction } from '../entities/payment-transaction.entity.js';

export interface PaymentTransactionRepository {
  findById(id: string): Promise<PaymentTransaction | null>;
  save(transaction: PaymentTransaction): Promise<void>;
}
