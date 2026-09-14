import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { buildAppointmentIcs } from '../../ics/build-appointment-ics.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';

import type { GenerateAppointmentCalendarInviteQuery } from './generate-appointment-calendar-invite.query.js';

// K11 -- Calendar sync (ORIVEX Remaining Work Audit). Assembles a real
// RFC 5545 .ics invite from this appointment's own real data -- no
// external provider, no OAuth, nothing fabricated. See
// build-appointment-ics.ts's own header comment for what this does and
// does not cover.
export class GenerateAppointmentCalendarInviteUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
  ) {}

  async execute(query: GenerateAppointmentCalendarInviteQuery): Promise<string> {
    const appointment = await this.appointmentRepository.findById(query.appointmentId);
    if (!appointment) {
      throw new NotFoundError(`Appointment "${query.appointmentId}" not found.`);
    }

    const [window, doctorProfile, patientProfile] = await Promise.all([
      this.getAvailabilityWindowByIdUseCase.execute({ availabilityWindowId: appointment.getAvailabilityWindowId() }),
      this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() }),
      this.getPatientProfileByIdUseCase.execute({ patientProfileId: appointment.getPatientId() }),
    ]);
    if (!doctorProfile || !patientProfile) {
      throw new NotFoundError('The doctor or patient on this appointment could not be found.');
    }

    const [doctorAccount, patientAccount] = await Promise.all([
      this.getAccountByIdUseCase.execute({ accountId: doctorProfile.getAccountId() }),
      this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() }),
    ]);
    if (!doctorAccount || !patientAccount) {
      throw new NotFoundError('The doctor or patient account on this appointment could not be found.');
    }

    // Falls back to the appointment's own scheduledAt + a real 30-minute
    // default only if the originating AvailabilityWindow has since been
    // deleted (Join-Window/Stale-Slot Reclamation can remove a never-booked
    // window, but a real Appointment's own window is never deleted while
    // the appointment still references it) -- never a fabricated duration.
    const startsAt = appointment.getScheduledAt();
    const endsAt = window ? window.getEndTime() : new Date(startsAt.getTime() + 30 * 60_000);

    return buildAppointmentIcs({
      appointmentId: appointment.getId(),
      doctorDisplayName: doctorAccount.getUserProfile().getDisplayName().toString(),
      patientDisplayName: patientAccount.getUserProfile().getDisplayName().toString(),
      startsAt,
      endsAt,
      reasonForVisit: appointment.getReasonForVisit(),
      isVirtual: true,
    });
  }
}
