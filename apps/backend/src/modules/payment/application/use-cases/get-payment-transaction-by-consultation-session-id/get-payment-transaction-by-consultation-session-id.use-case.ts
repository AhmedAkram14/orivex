import type { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

import type { GetPaymentTransactionByConsultationSessionIdQuery } from './get-payment-transaction-by-consultation-session-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern). Backs the doctor-facing "refund
// this consultation's payment" action (ORIVEX Roadmap 2.0 Stage 1).
export class GetPaymentTransactionByConsultationSessionIdUseCase {
  constructor(private readonly paymentTransactionRepository: PaymentTransactionRepository) {}

  async execute(query: GetPaymentTransactionByConsultationSessionIdQuery): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
