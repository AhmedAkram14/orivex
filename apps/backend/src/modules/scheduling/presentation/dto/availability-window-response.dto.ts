import type { AvailabilityWindow } from '../../../doctor/domain/entities/availability-window.entity.js';
import type { AvailabilityWindowStatus } from '../../../doctor/domain/enums/availability-window-status.enum.js';
import type { ConsultationType } from '../../../doctor/domain/enums/consultation-type.enum.js';

// The patient-facing shape of a real, bookable AvailabilityWindow -- only
// ever returned for windows GetBookableAvailabilityUseCase has already
// filtered down to genuinely available (Open, or a lapsed Held).
//
// Consultation Pricing Redesign: feeAmount/feeCurrency are this window's
// own real price -- the first time a patient sees a slot's actual cost
// before booking it (previously nothing in the booking flow showed a price
// at all).
export class AvailabilityWindowResponseDto {
  id!: string;
  doctorId!: string;
  startTime!: string;
  endTime!: string;
  consultationType!: ConsultationType;
  feeAmount!: number | null;
  feeCurrency!: string | null;
  status!: AvailabilityWindowStatus;

  static fromDomain(window: AvailabilityWindow): AvailabilityWindowResponseDto {
    const dto = new AvailabilityWindowResponseDto();
    dto.id = window.getId();
    dto.doctorId = window.getDoctorId();
    dto.startTime = window.getStartTime().toISOString();
    dto.endTime = window.getEndTime().toISOString();
    dto.consultationType = window.getPricing().getPricingType();
    const fee = window.getPricing().getFee();
    dto.feeAmount = fee?.getAmount() ?? null;
    dto.feeCurrency = fee?.getCurrency() ?? null;
    dto.status = window.getStatus();
    return dto;
  }
}
