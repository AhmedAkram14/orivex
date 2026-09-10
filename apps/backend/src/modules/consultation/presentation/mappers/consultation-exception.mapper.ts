import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { DoctorDomainError } from '../../../doctor/domain/exceptions/doctor-domain.error.js';
import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';
import { FreeTierMonthlyCapExceededError } from '../../domain/exceptions/free-tier-monthly-cap-exceeded.error.js';
import { NoShowBookingRestrictedError } from '../../domain/exceptions/no-show-booking-restricted.error.js';

// Translates this module's own domain exceptions into the shared,
// HTTP-mappable AppError types (mirrors Identity/Doctor/Asset/Trust's
// exception-mapper pattern). Also translates DoctorDomainError specifically
// for the slot-already-held/booked case raised by SchedulingModule's
// exported use cases (which wrap DoctorModule's AvailabilityWindow) --
// docs/12-openapi.md's bookAppointment documents '409': Conflict for
// exactly this "slot already booked" race, so this is presentation-layer
// translation of a cross-module error, not business logic living in a use
// case.
export function mapConsultationError(error: unknown): unknown {
  // I8 -- Free-tier abuse controls: named Business Rule Error codes (docs/
  // 11-api-contracts.md §7) checked first, since both are
  // ConsultationDomainError subtypes -- same "check the specific subtype
  // before the generic base type" precedent as DoctorModule's own mapper.
  if (error instanceof FreeTierMonthlyCapExceededError) {
    return new ValidationError(error.message, 'FREE_TIER_CAP_EXCEEDED');
  }
  if (error instanceof NoShowBookingRestrictedError) {
    return new ValidationError(error.message, 'NO_SHOW_BOOKING_RESTRICTED');
  }
  if (error instanceof ConsultationDomainError) {
    return new ValidationError(error.message);
  }
  if (error instanceof DoctorDomainError) {
    return new ConflictError(error.message);
  }
  return error;
}
