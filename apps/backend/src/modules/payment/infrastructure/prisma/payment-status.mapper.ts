import { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';

import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's PaymentTransaction.status
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<PaymentStatus, PrismaPaymentStatus> = {
  [PaymentStatus.Initiated]: PrismaPaymentStatus.INITIATED,
  [PaymentStatus.Succeeded]: PrismaPaymentStatus.SUCCEEDED,
  [PaymentStatus.Failed]: PrismaPaymentStatus.FAILED,
  [PaymentStatus.Settled]: PrismaPaymentStatus.SETTLED,
  [PaymentStatus.Refunded]: PrismaPaymentStatus.REFUNDED,
  [PaymentStatus.Disputed]: PrismaPaymentStatus.DISPUTED,
};

const PRISMA_TO_DOMAIN: Record<PrismaPaymentStatus, PaymentStatus> = {
  [PrismaPaymentStatus.INITIATED]: PaymentStatus.Initiated,
  [PrismaPaymentStatus.SUCCEEDED]: PaymentStatus.Succeeded,
  [PrismaPaymentStatus.FAILED]: PaymentStatus.Failed,
  [PrismaPaymentStatus.SETTLED]: PaymentStatus.Settled,
  [PrismaPaymentStatus.REFUNDED]: PaymentStatus.Refunded,
  [PrismaPaymentStatus.DISPUTED]: PaymentStatus.Disputed,
};

export function toPrismaPaymentStatus(status: PaymentStatus): PrismaPaymentStatus {
  return DOMAIN_TO_PRISMA[status];
}

export function toDomainPaymentStatus(status: PrismaPaymentStatus): PaymentStatus {
  return PRISMA_TO_DOMAIN[status];
}
