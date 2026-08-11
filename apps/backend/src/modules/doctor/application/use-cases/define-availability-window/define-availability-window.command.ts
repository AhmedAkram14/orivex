import type { ConsultationPricing } from '../../../domain/value-objects/consultation-pricing.value-object.js';

export interface DefineAvailabilityWindowCommandProps {
  doctorId: string;
  startTime: Date;
  endTime: Date;
  pricing: ConsultationPricing;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class DefineAvailabilityWindowCommand {
  readonly doctorId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly pricing: ConsultationPricing;

  constructor(props: DefineAvailabilityWindowCommandProps) {
    this.doctorId = props.doctorId;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.pricing = props.pricing;
  }
}
