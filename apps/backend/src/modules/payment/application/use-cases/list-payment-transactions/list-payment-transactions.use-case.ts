import type { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

import type { ListPaymentTransactionsQuery } from './list-payment-transactions.query.js';

export interface ListPaymentTransactionsResult {
  transactions: PaymentTransaction[];
  total: number;
}

// Plain TypeScript class -- no NestJS dependency; DI wiring lives in
// payment.module.ts only.
//
// ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: backs
// AdministrationModule's SuperAdmin-facing payment transaction list, the
// same one-way-dependency shape ListAccountsUseCase already established for
// IdentityModule -> AdministrationModule. Exported for AdministrationModule
// to consume; PaymentModule itself remains unaware that AdministrationModule
// exists.
export class ListPaymentTransactionsUseCase {
  constructor(private readonly paymentTransactionRepository: PaymentTransactionRepository) {}

  async execute(query: ListPaymentTransactionsQuery): Promise<ListPaymentTransactionsResult> {
    const offset = (query.page - 1) * query.limit;
    return this.paymentTransactionRepository.findAll({ limit: query.limit, offset });
  }
}
