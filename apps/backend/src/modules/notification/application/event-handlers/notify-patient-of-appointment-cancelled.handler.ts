import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AppointmentCancelledEventPayload {
  appointmentId: string;
  cancelledBy: 'doctor' | 'patient';
}

// Critical Lifecycle Gaps (Phase 3, Step 2): a patient previously had no
// notification at all that their appointment was cancelled --
// 'consultation.appointment.cancelled' has existed since the cancel() path
// was added but only PaymentModule ever subscribed to it (for the
// automatic-refund rule, now unconditional for both doctor- and patient-
// initiated cancellation); nothing in NotificationModule did.
// Reacting to ConsultationModule's event by name only, mirroring every
// other handler's cross-module boundary (e.g.
// NotifyPatientOfAppointmentConfirmedHandler).
export class NotifyPatientOfAppointmentCancelledHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentCancelledEventPayload): Promise<void> {
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

      const description =
        event.cancelledBy === 'doctor'
          ? 'Your doctor cancelled your appointment. Any payment made will be refunded automatically.'
          : 'Your appointment has been cancelled. Any payment made will be refunded automatically.';

      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'Appointment cancelled',
        description,
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
          'appointment-cancelled',
          { cancelledBy: event.cancelledBy },
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // RescheduleOrCancelAppointmentUseCase, which has already saved the
      // appointment by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the patient of an appointment cancellation',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
