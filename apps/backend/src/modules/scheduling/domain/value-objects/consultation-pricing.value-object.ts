import { SchedulingDomainError } from '../exceptions/scheduling-domain.error.js';
import { ConsultationType } from '../enums/consultation-type.enum.js';

import { Money } from './money.value-object.js';

// SchedulingModule's own copy -- the recurring weekly template's per-day
// default price that GetBookableAvailabilityUseCase stamps onto each
// AvailabilityWindow it materializes. Same shape and invariant as
// DoctorModule's/ConsultationModule's copies, by the same duplication
// convention.
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

  static create(pricingType: ConsultationType, fee?: Money): ConsultationPricing {
    if (pricingType === ConsultationType.Free) {
      if (fee) {
        throw new SchedulingDomainError('A free consultation cannot have a fee.');
      }
      return new ConsultationPricing(pricingType, undefined);
    }
    if (!fee) {
      throw new SchedulingDomainError('A paid consultation requires a fee.');
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
