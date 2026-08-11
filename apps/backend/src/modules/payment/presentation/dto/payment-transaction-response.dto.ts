import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import type { PaymentStatus } from '../../domain/enums/payment-status.enum.js';

import { MoneyDto } from './money.dto.js';

// Matches docs/12-openapi.md's PaymentTransaction schema exactly.
export class PaymentTransactionResponseDto {
  id!: string;
  appointmentId!: string;
  consultationSessionId!: string | null;
  amount!: MoneyDto;
  status!: PaymentStatus;
  createdAt!: string;

  static fromDomain(transaction: PaymentTransaction): PaymentTransactionResponseDto {
    const dto = new PaymentTransactionResponseDto();
    dto.id = transaction.getId();
    dto.appointmentId = transaction.getAppointmentId();
    dto.consultationSessionId = transaction.getConsultationSessionId() ?? null;
    dto.amount = {
      amount: transaction.getAmount().getAmount(),
      currency: transaction.getAmount().getCurrency(),
    };
    dto.status = transaction.getStatus();
    dto.createdAt = transaction.getCreatedAt().toISOString();
    return dto;
  }
}
