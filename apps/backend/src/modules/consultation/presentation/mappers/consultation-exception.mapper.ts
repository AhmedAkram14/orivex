import { ConflictError, ValidationError } from '../../../../shared/errors/app-error.js';
import { DoctorDomainError } from '../../../doctor/domain/exceptions/doctor-domain.error.js';
import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';

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
  if (error instanceof ConsultationDomainError) {
    return new ValidationError(error.message);
  }
  if (error instanceof DoctorDomainError) {
    return new ConflictError(error.message);
  }
  return error;
}
