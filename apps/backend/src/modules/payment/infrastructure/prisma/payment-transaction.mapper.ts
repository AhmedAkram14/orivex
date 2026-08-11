import type { PaymentTransaction as PrismaPaymentTransactionRow } from '@prisma/client';

import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { Money } from '../../domain/value-objects/money.value-object.js';

import { toDomainPaymentMethod } from './payment-method.mapper.js';
import { toDomainPaymentStatus } from './payment-status.mapper.js';

export function toDomainPaymentTransaction(row: PrismaPaymentTransactionRow): PaymentTransaction {
  return PaymentTransaction.reconstitute({
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    // Nullable only for rows created before this column existed (see the
    // migration) -- every row created by the current InitiateChargeUseCase
    // always sets it, so this fallback is legacy-data-only.
    appointmentId: row.appointmentId ?? '',
    consultationSessionId: row.consultationSessionId ?? undefined,
    patientId: row.patientId,
    doctorId: row.doctorId,
    amount: Money.create(Number(row.amount), row.currency),
    paymentMethod: toDomainPaymentMethod(row.paymentMethod),
    status: toDomainPaymentStatus(row.status),
    externalReference: row.externalReference ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
