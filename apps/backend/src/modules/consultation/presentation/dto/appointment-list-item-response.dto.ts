import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

export interface AppointmentFeeDto {
  amount: number;
  currency: string;
}

// The patient's own appointment list (GET /appointments/me). Composes
// DoctorModule's DoctorProfile + IdentityModule's Account for display name/
// specialty -- module-to-module calls through exported use cases only, same
// pattern BookAppointmentUseCase already established. Deliberately no
// `type`/`location` fields (in-person vs. video, physical address) -- no
// backend concept of either exists yet, only `consultationType` (free/paid).
//
// consultationSessionId/paymentRequired/feeAmount (ORIVEX Roadmap 2.0 Stage
// 1) let the frontend show a real "Pay now" action: paymentRequired is true
// exactly when this appointment is Paid and still Requested -- since a
// successful payment immediately confirms the appointment
// (InitiateChargeUseCase -> ConfirmAppointmentUseCase), "Requested" for a
// Paid appointment can only mean payment hasn't succeeded yet. This is
// computed locally from fields already on this DTO, not by querying
// PaymentModule -- ConsultationModule must never depend on PaymentModule
// (docs/10-backend-architecture.md's dependency table), only the reverse.
export class AppointmentListItemResponseDto {
  id!: string;
  scheduledAt!: string;
  /** Patient-Facing Reschedule (Phase 3 Step 2): additive field so the frontend can look up the same doctor's real availability windows (`GET /doctors/:doctorId/availability-windows`) when rescheduling -- `Appointment.getDoctorId()` already existed on the domain entity, this just maps it through. */
  doctorId!: string;
  doctorName!: string;
  specialization!: string;
  /** Localization fix: the Arabic specialty name, null until an admin has translated it -- the frontend picks whichever matches the caller's locale. */
  specializationAr!: string | null;
  status!: AppointmentStatus;
  consultationType!: ConsultationType;
  reasonForVisit!: string | null;
  consultationSessionId!: string | null;
  paymentRequired!: boolean;
  feeAmount!: AppointmentFeeDto | null;

  static fromDomain(
    appointment: Appointment,
    doctorAccount: Account,
    consultationSessionId: string | null,
    specialization: string,
    specializationAr: string | null = null,
  ): AppointmentListItemResponseDto {
    const dto = new AppointmentListItemResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.doctorId = appointment.getDoctorId();
    dto.doctorName = doctorAccount.getUserProfile().getDisplayName().toString();
    dto.specialization = specialization;
    dto.specializationAr = specializationAr;
    dto.status = appointment.getStatus();
    dto.consultationType = appointment.getPricing().getPricingType();
    dto.reasonForVisit = appointment.getReasonForVisit() ?? null;
    dto.consultationSessionId = consultationSessionId;

    dto.paymentRequired =
      appointment.getPricing().getPricingType() === ConsultationType.Paid && appointment.getStatus() === AppointmentStatus.Requested;

    // Consultation Pricing Redesign: the appointment's own snapshotted fee,
    // not DoctorProfile's former global one -- a real per-appointment
    // amount/currency, not a hardcoded 'EGP' assumption.
    const fee = appointment.getPricing().getFee();
    dto.feeAmount = dto.paymentRequired && fee ? { amount: fee.getAmount(), currency: fee.getCurrency() } : null;

    return dto;
  }
}
