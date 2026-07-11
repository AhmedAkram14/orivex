import type { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

import type { GetPaymentTransactionByIdQuery } from './get-payment-transaction-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern). No REST endpoint exposes this --
// docs/12-openapi.md documents no GET /payments/{id}; this supports the
// "Payment status" scope item as an internal query only.
export class GetPaymentTransactionByIdUseCase {
  constructor(private readonly paymentTransactionRepository: PaymentTransactionRepository) {}

  async execute(query: GetPaymentTransactionByIdQuery): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findById(query.paymentTransactionId);
  }
}
