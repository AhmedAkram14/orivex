import { ConsultationType as DoctorConsultationType } from '../../../doctor/domain/enums/consultation-type.enum.js';
import type { ConsultationPricing as DoctorConsultationPricing } from '../../../doctor/domain/value-objects/consultation-pricing.value-object.js';
import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';
import { ConsultationPricing } from '../../domain/value-objects/consultation-pricing.value-object.js';
import { Money } from '../../domain/value-objects/money.value-object.js';

// Translates DoctorModule's AvailabilityWindow.getPricing() (that module's
// own ConsultationPricing) into ConsultationModule's own copy, at the one
// moment a booking/reschedule snapshots a window's price onto an
// Appointment. Application-layer code, not domain-layer -- BookAppointmentUseCase
// already reaches into DoctorModule's domain enums/exceptions the same way;
// this is the same precedent, just for the new VO.
export function toConsultationModulePricing(pricing: DoctorConsultationPricing): ConsultationPricing {
  const pricingType = pricing.getPricingType() === DoctorConsultationType.Paid ? ConsultationType.Paid : ConsultationType.Free;
  const fee = pricing.getFee();
  return ConsultationPricing.create(pricingType, fee ? Money.create(fee.getAmount(), fee.getCurrency()) : undefined);
}
