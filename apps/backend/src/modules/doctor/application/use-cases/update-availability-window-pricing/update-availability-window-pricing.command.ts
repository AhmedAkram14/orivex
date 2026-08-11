import type { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';

export interface UpdateAvailabilityWindowPricingCommandProps {
  availabilityWindowId: string;
  // The caller's own doctor id (from the authenticated session) -- checked
  // against the window's owner so a doctor can never reprice another
  // doctor's slot.
  requestingDoctorId: string;
  pricing: ConsultationPricing;
}

export class UpdateAvailabilityWindowPricingCommand {
  readonly availabilityWindowId: string;
  readonly requestingDoctorId: string;
  readonly pricing: ConsultationPricing;

  constructor(props: UpdateAvailabilityWindowPricingCommandProps) {
    this.availabilityWindowId = props.availabilityWindowId;
    this.requestingDoctorId = props.requestingDoctorId;
    this.pricing = props.pricing;
  }
}
