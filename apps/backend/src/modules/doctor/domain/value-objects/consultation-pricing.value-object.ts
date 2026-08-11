import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';
import { ConsultationType } from '../enums/consultation-type.enum.js';

import { Money } from './money.value-object.js';

// Consultation Pricing Redesign: pricing belongs to the slot, not the
// doctor profile. Deliberately minimal -- pricingType + an optional fee,
// nothing else. This is a *listing-time* fact (what a slot advertises),
// not a checkout-time computation: coupons, insurance adjustments, and
// dynamic/surge pricing are inputs to a future charge-computation step
// that takes this VO's fee as its base, never fields added to this VO
// itself. Weekend/holiday pricing are satisfied by *where* this VO gets
// constructed (a per-weekday default, a per-date exception override), not
// by changing its shape. See docs/roadmaps -- Consultation Pricing
// Redesign completion note for the full reasoning.
export class ConsultationPricing {
  private constructor(
    private readonly pricingType: ConsultationType,
    private readonly fee: Money | undefined,
  ) {}

  static free(): ConsultationPricing {
    return new ConsultationPricing(ConsultationType.Free, undefined);
  }

  static paid(fee: Money): ConsultationPricing {
    return new ConsultationPricing(ConsultationType.Paid, fee);
  }

  // General constructor for reconstitution/mapper use -- validates the
  // same invariant `free()`/`paid()` enforce by construction: Free never
  // carries a fee, Paid always does.
  static create(pricingType: ConsultationType, fee?: Money): ConsultationPricing {
    if (pricingType === ConsultationType.Free) {
      if (fee) {
        throw new DoctorDomainError('A free consultation cannot have a fee.');
      }
      return new ConsultationPricing(pricingType, undefined);
    }
    if (!fee) {
      throw new DoctorDomainError('A paid consultation requires a fee.');
    }
    return new ConsultationPricing(pricingType, fee);
  }

  getPricingType(): ConsultationType {
    return this.pricingType;
  }

  getFee(): Money | undefined {
    return this.fee;
  }

  isFree(): boolean {
    return this.pricingType === ConsultationType.Free;
  }

  equals(other: ConsultationPricing): boolean {
    if (this.pricingType !== other.pricingType) return false;
    if (!this.fee && !other.fee) return true;
    if (!this.fee || !other.fee) return false;
    return this.fee.equals(other.fee);
  }
}
