import type { Appointment } from '../../domain/entities/appointment.entity.js';
import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import type { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// Own additive shape, not the full documented AppointmentSummary --
// AppointmentSummary nests PatientSummary/DoctorSummary, which compose data
// from ReferenceData/Trust/Review modules that don't exist. Same precedent
// as DoctorModule's own profile DTOs versus the undocumented composite
// search endpoints.
export class AppointmentResponseDto {
  id!: string;
  patientId!: string;
  doctorId!: string;
  availabilityWindowId!: string;
  consultationType!: ConsultationType;
  feeAmount!: number | null;
  feeCurrency!: string | null;
  status!: AppointmentStatus;
  scheduledAt!: string;
  reasonForVisit!: string | null;
  rescheduledFromId!: string | null;

  static fromDomain(appointment: Appointment): AppointmentResponseDto {
    const dto = new AppointmentResponseDto();
    dto.id = appointment.getId();
    dto.patientId = appointment.getPatientId();
    dto.doctorId = appointment.getDoctorId();
    dto.availabilityWindowId = appointment.getAvailabilityWindowId();
    dto.consultationType = appointment.getPricing().getPricingType();
    const fee = appointment.getPricing().getFee();
    dto.feeAmount = fee?.getAmount() ?? null;
    dto.feeCurrency = fee?.getCurrency() ?? null;
    dto.status = appointment.getStatus();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.reasonForVisit = appointment.getReasonForVisit() ?? null;
    dto.rescheduledFromId = appointment.getRescheduledFromId() ?? null;
    return dto;
  }
}
