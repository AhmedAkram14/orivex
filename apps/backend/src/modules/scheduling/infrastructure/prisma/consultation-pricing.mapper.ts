import type { ConsultationType as PrismaConsultationType } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';

import { toDomainConsultationType, toPrismaConsultationType } from './consultation-type.mapper.js';

// SchedulingModule's own copy -- reconstructs WorkingHoursDay's default
// pricing from its flattened columns (pricingType, feeAmount, feeCurrency).
export function toDomainConsultationPricing(row: {
  pricingType: PrismaConsultationType;
  feeAmount: Decimal | null;
  feeCurrency: string | null;
}): ConsultationPricing {
  const pricingType = toDomainConsultationType(row.pricingType);
  if (row.feeAmount === null) {
    return ConsultationPricing.create(pricingType);
  }
  return ConsultationPricing.create(pricingType, Money.create(Number(row.feeAmount), row.feeCurrency ?? 'EGP'));
}

export function toPersistedConsultationPricing(pricing: ConsultationPricing) {
  const fee = pricing.getFee();
  return {
    pricingType: toPrismaConsultationType(pricing.getPricingType()),
    feeAmount: fee ? fee.getAmount() : null,
    feeCurrency: fee ? fee.getCurrency() : null,
  };
}
