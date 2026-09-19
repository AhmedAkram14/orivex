import type { PaymentTransaction } from '../../../domain/entities/payment-transaction.entity.js';
import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

import type { GetDoctorEarningsTransactionsQuery } from './get-doctor-earnings-transactions.query.js';

// Doctor Earnings page rebuild (Phase 1) -- backs the drill-down table.
// Deliberately separate from GetDoctorEarningsSummaryUseCase (one
// use-case-per-concern, matching this series' own convention) and
// deliberately does NOT filter by EARNED_STATUSES like the summary does:
// every status within the range comes back, including Refunded, so a
// refunded transaction stays visible as a labeled line item instead of
// silently vanishing (plan decision 3, refund transparency). Callers that
// need sums exclude non-earned statuses themselves.
export class GetDoctorEarningsTransactionsUseCase {
  constructor(private readonly paymentTransactionRepository: PaymentTransactionRepository) {}

  async execute(query: GetDoctorEarningsTransactionsQuery): Promise<PaymentTransaction[]> {
    // findByDoctorId already returns newest-first (see
    // PrismaPaymentTransactionRepository.findByDoctorId's `orderBy:
    // { createdAt: 'desc' }`) -- no re-sort needed here.
    return this.paymentTransactionRepository.findByDoctorId(query.doctorId, {
      from: query.dateFrom,
      to: query.dateTo,
    });
  }
}
