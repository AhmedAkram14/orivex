import type { Account } from '../../../identity/domain/entities/account.entity.js';
import type { DoctorProfile } from '../../../doctor/domain/entities/doctor-profile.entity.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { ConsultationType } from '../../domain/enums/consultation-type.enum.js';

// This is the same acknowledged gap InitiateChargeUseCase's own comment
// documents: "Currency is still client-supplied: DoctorProfile has no
// currency field of its own yet ... a known, narrower gap." Egypt V1
// (docs/06-system-architecture.md) is single-currency in practice; this
// constant makes that assumption explicit and in one place rather than a
// silent magic string, without pretending the underlying gap is closed.
const EGYPT_V1_DEFAULT_CURRENCY = 'EGP';

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
  doctorName!: string;
  specialization!: string;
  status!: AppointmentStatus;
  consultationType!: ConsultationType;
  reasonForVisit!: string | null;
  consultationSessionId!: string | null;
  paymentRequired!: boolean;
  feeAmount!: AppointmentFeeDto | null;

  static fromDomain(
    appointment: Appointment,
    doctorProfile: DoctorProfile,
    doctorAccount: Account,
    consultationSessionId: string | null,
    specialization: string,
  ): AppointmentListItemResponseDto {
    const dto = new AppointmentListItemResponseDto();
    dto.id = appointment.getId();
    dto.scheduledAt = appointment.getScheduledAt().toISOString();
    dto.doctorName = doctorAccount.getUserProfile().getDisplayName().toString();
    dto.specialization = specialization;
    dto.status = appointment.getStatus();
    dto.consultationType = appointment.getConsultationType();
    dto.reasonForVisit = appointment.getReasonForVisit() ?? null;
    dto.consultationSessionId = consultationSessionId;

    dto.paymentRequired =
      appointment.getConsultationType() === ConsultationType.Paid && appointment.getStatus() === AppointmentStatus.Requested;

    const feeAmount = doctorProfile.getConsultationFeeAmount();
    dto.feeAmount = dto.paymentRequired && feeAmount !== undefined ? { amount: feeAmount, currency: EGYPT_V1_DEFAULT_CURRENCY } : null;

    return dto;
  }
}
