import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AppointmentConfirmedEventPayload {
  appointmentId: string;
}

// The patient previously had no way to learn their appointment had been
// approved short of reloading their appointments list -- confirm() raised
// no event at all before this fix (§3/§4 of the doctor-approval-workflow
// fix). NotificationModule reacting to ConsultationModule's
// 'consultation.appointment.confirmed' event by name only, mirroring every
// other handler's cross-module boundary.
export class NotifyPatientOfAppointmentConfirmedHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentConfirmedEventPayload): Promise<void> {
    try {
      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: event.appointmentId });
      if (!appointment) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: appointment.getPatientId(),
      });
      if (!patientProfile) {
        return;
      }

      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'Appointment approved',
        description: 'Your doctor has approved your appointment request.',
        actionUrl: '/patient/appointments',
      });
      await this.notificationRepository.save(notification);

      // I3 -- Notification delivery channels (docs/01-prd.md "we'll email
      // you" affordances). Reuses AuthenticationModule's own EMAIL_SENDER
      // port (already bound to SendGrid/LoggingEmailSender), never a second
      // email-sending path. PHI-light by construction: no reason for visit,
      // diagnosis, or other clinical detail in the template's data.
      const account = await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() });
      if (account) {
        await this.emailSender.send(account.getEmail().toString(), 'appointment-confirmed', {
          scheduledAt: appointment.getScheduledAt().toISOString(),
        });
      }
    } catch (error) {
      // A notification failure must never surface back through
      // ApproveAppointmentUseCase, which has already saved the appointment
      // by the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify the patient of an appointment confirmation',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
