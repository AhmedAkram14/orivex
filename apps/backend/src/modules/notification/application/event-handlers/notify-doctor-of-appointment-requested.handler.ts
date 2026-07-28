import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AppointmentRequestedEventPayload {
  appointmentId: string;
}

// A doctor previously had no way to learn a patient had booked/requested an
// appointment short of manually reloading their queue -- nothing notified
// them at all (see `ScheduleAppointmentReminderHandler`, which reacts to
// this same event but only ever schedules the PATIENT's own reminder).
// NotificationModule reacting to ConsultationModule's already-published
// 'consultation.appointment.booked' event by name only, mirroring every
// other handler's cross-module boundary. Every booking (Free or Paid) now
// starts Requested and needs the doctor's own approval (§3 of this fix) --
// this is the doctor's cue to go approve it.
export class NotifyDoctorOfAppointmentRequestedHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentRequestedEventPayload): Promise<void> {
    try {
      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.appointmentId });
      if (!appointment) {
        return;
      }

      const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: appointment.getDoctorId() });
      if (!doctorProfile) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: appointment.getPatientId(),
      });
      const patientAccount = patientProfile
        ? await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() })
        : null;

      const description = patientAccount
        ? `${patientAccount.getUserProfile().getDisplayName().toString()} has requested an appointment. Approve it to add them to your queue.`
        : 'A new appointment request is awaiting your approval.';

      const notification = Notification.create({
        accountId: doctorProfile.getAccountId(),
        title: 'New appointment request',
        description,
        actionUrl: '/doctor/queue',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // BookAppointmentUseCase, which has already saved the appointment by
      // the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify the doctor of a new appointment request',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
