import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AppointmentExpiredEventPayload {
  appointmentId: string;
}

// Phase 0 (stale-request terminal state): a patient previously had no
// notification at all when their request went stale -- it just silently
// disappeared from every doctor-side view with no answer ever given.
// Mirrors NotifyPatientOfAppointmentCancelledHandler's exact shape, reacting
// to ConsultationModule's 'consultation.appointment.expired' event by name
// only (cross-module boundary, same as every other handler in this module).
export class NotifyPatientOfAppointmentExpiredHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentExpiredEventPayload): Promise<void> {
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
        title: 'Appointment request expired',
        description: 'Your appointment request expired unanswered. You can book a new appointment with this doctor.',
        actionUrl: '/patient/appointments',
      });
      await this.notificationRepository.save(notification);

      // I3 -- Notification delivery channels. Reuses AuthenticationModule's
      // own EMAIL_SENDER port, never a second email-sending path. PHI-light
      // by construction -- no reason for visit or other clinical detail.
      const account = await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() });
      if (account) {
        await this.emailSender.send(
          account.getEmail().toString(),
          'appointment-expired',
          {},
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // ExpireStaleAppointmentsUseCase's periodic sweep, which has already
      // saved the appointment by the time domain events dispatch (same
      // tolerance as every other handler in this module).
      this.logger.error(
        'Failed to notify the patient of an expired appointment request',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
