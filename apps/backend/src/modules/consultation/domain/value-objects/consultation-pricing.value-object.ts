import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';
import { ConsultationType } from '../enums/consultation-type.enum.js';

import { Money } from './money.value-object.js';

// Consultation Pricing Redesign: ConsultationModule's own copy of
// DoctorModule's ConsultationPricing VO -- Appointment snapshots the
// booked window's pricing at booking time (never a live reference back to
// AvailabilityWindow), so a later slot repricing (or the window/template
// changing) can never retroactively change what a specific appointment
// was charged. Same duplication convention as ConsultationType.
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
        throw new ConsultationDomainError('A free consultation cannot have a fee.');
      }
      return new ConsultationPricing(pricingType, undefined);
    }
    if (!fee) {
      throw new ConsultationDomainError('A paid consultation requires a fee.');
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
