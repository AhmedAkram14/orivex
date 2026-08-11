import type { ConsultationType as PrismaConsultationType } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';

import { toDomainConsultationType, toPrismaConsultationType } from './consultation-type.mapper.js';

// Reconstructs the domain-layer ConsultationPricing VO from the flattened
// Prisma columns (consultationType, feeAmount, feeCurrency) any row that
// owns pricing persists -- AvailabilityWindow today, same shape reused
// wherever else this VO is persisted.
export function toDomainConsultationPricing(row: {
  consultationType: PrismaConsultationType;
  feeAmount: Decimal | null;
  feeCurrency: string | null;
}): ConsultationPricing {
  const pricingType = toDomainConsultationType(row.consultationType);
  // Defensive read: legacy rows from before per-slot pricing existed can
  // have a stored feeAmount of 0 -- Money.create() correctly rejects a
  // non-positive amount as a write-time invariant, but that must never
  // turn into a 500 for every read of a historical row. Treat "no positive
  // fee on record" the same as "no fee on record": Free.
  if (row.feeAmount === null || Number(row.feeAmount) <= 0) {
    return ConsultationPricing.create(pricingType);
  }
  return ConsultationPricing.create(pricingType, Money.create(Number(row.feeAmount), row.feeCurrency ?? 'EGP'));
}

export function toPersistedConsultationPricing(pricing: ConsultationPricing) {
  const fee = pricing.getFee();
  return {
    consultationType: toPrismaConsultationType(pricing.getPricingType()),
    feeAmount: fee ? fee.getAmount() : null,
    feeCurrency: fee ? fee.getCurrency() : null,
  };
}
