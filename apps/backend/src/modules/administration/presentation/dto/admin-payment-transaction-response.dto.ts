import type { AdminPaymentTransactionRow } from '../../application/use-cases/list-payment-transactions-for-admin/list-payment-transactions-for-admin.use-case.js';
import { MoneyDto } from '../../../payment/presentation/dto/money.dto.js';
import type { PaymentStatus } from '../../../payment/domain/enums/payment-status.enum.js';

// SuperAdmin-facing payment transaction row (ORIVEX Roadmap Phase 3,
// Critical Lifecycle Gaps, Step 4) -- deliberately smaller than
// PaymentTransactionResponseDto: adds resolved patient/doctor display
// names (the admin table's whole reason for existing) and drops fields
// (appointmentId, consultationSessionId) the admin list doesn't need.
export class AdminPaymentTransactionResponseDto {
  id!: string;
  patientName!: string;
  doctorName!: string;
  amount!: MoneyDto;
  status!: PaymentStatus;
  createdAt!: string;

  static fromRow(row: AdminPaymentTransactionRow): AdminPaymentTransactionResponseDto {
    const dto = new AdminPaymentTransactionResponseDto();
    dto.id = row.transaction.getId();
    dto.patientName = row.patientName;
    dto.doctorName = row.doctorName;
    dto.amount = {
      amount: row.transaction.getAmount().getAmount(),
      currency: row.transaction.getAmount().getCurrency(),
    };
    dto.status = row.transaction.getStatus();
    dto.createdAt = row.transaction.getCreatedAt().toISOString();
    return dto;
  }
}
