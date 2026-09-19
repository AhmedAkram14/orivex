import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import type { PaymentStatus } from '../../domain/enums/payment-status.enum.js';

import { MoneyDto } from './money.dto.js';

// Doctor Earnings page rebuild (Phase 1) -- backs the drill-down table's
// rows. `patientName` is resolved by PaymentController (batch, de-duplicated
// by patientId, mirroring doctor-appointments.controller.ts's
// toPatientListItems pattern) rather than inside this DTO's own
// domain-mapping method, since PaymentModule has no direct access to
// Patient/Identity data -- so the resolved name is passed in alongside the
// domain entity here instead.
export class DoctorEarningsTransactionResponseDto {
  id!: string;
  appointmentId!: string;
  consultationSessionId!: string | null;
  patientId!: string;
  patientName!: string;
  amount!: MoneyDto;
  status!: PaymentStatus;
  createdAt!: string;

  static fromDomain(transaction: PaymentTransaction, patientName: string): DoctorEarningsTransactionResponseDto {
    const dto = new DoctorEarningsTransactionResponseDto();
    dto.id = transaction.getId();
    dto.appointmentId = transaction.getAppointmentId();
    dto.consultationSessionId = transaction.getConsultationSessionId() ?? null;
    dto.patientId = transaction.getPatientId();
    dto.patientName = patientName;
    dto.amount = {
      amount: transaction.getAmount().getAmount(),
      currency: transaction.getAmount().getCurrency(),
    };
    dto.status = transaction.getStatus();
    dto.createdAt = transaction.getCreatedAt().toISOString();
    return dto;
  }
}
