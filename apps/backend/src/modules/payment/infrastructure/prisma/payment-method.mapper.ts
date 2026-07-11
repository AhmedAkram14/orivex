import { PaymentMethod as PrismaPaymentMethod } from '@prisma/client';

import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's initiateCharge paymentMethod
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<PaymentMethod, PrismaPaymentMethod> = {
  [PaymentMethod.Card]: PrismaPaymentMethod.CARD,
  [PaymentMethod.MobileWallet]: PrismaPaymentMethod.MOBILE_WALLET,
};

const PRISMA_TO_DOMAIN: Record<PrismaPaymentMethod, PaymentMethod> = {
  [PrismaPaymentMethod.CARD]: PaymentMethod.Card,
  [PrismaPaymentMethod.MOBILE_WALLET]: PaymentMethod.MobileWallet,
};

export function toPrismaPaymentMethod(value: PaymentMethod): PrismaPaymentMethod {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainPaymentMethod(value: PrismaPaymentMethod): PaymentMethod {
  return PRISMA_TO_DOMAIN[value];
}
