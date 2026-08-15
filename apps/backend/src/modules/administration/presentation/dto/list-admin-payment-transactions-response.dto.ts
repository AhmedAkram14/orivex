import type { ListPaymentTransactionsForAdminResult } from '../../application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.use-case.js';

import { AdminPaymentTransactionResponseDto } from './admin-payment-transaction-response.dto.js';

// Mirrors ListAccountsResponseDto's own {items, total, page, limit} shape
// exactly -- this codebase's established admin-list pagination envelope.
export class ListAdminPaymentTransactionsResponseDto {
  transactions!: AdminPaymentTransactionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;

  static fromResult(result: ListPaymentTransactionsForAdminResult, page: number, limit: number): ListAdminPaymentTransactionsResponseDto {
    const dto = new ListAdminPaymentTransactionsResponseDto();
    dto.transactions = result.rows.map((row) => AdminPaymentTransactionResponseDto.fromRow(row));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
