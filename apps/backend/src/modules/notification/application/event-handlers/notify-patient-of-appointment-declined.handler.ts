import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import { NotificationCategory } from '../../domain/enums/notification-category.enum.js';
import { NotificationEntityType } from '../../domain/enums/notification-entity-type.enum.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';
import type { NotificationPreferenceGate } from '../services/notification-preference-gate.service.js';

export interface AppointmentDeclinedEventPayload {
  appointmentId: string;
  reason?: string;
}

// Doctor Patient Chart Phase 2 left this event ('consultation.appointment.
// declined') with no subscriber at all -- a doctor could decline a request
// and the patient was never told, distinct from the separately-handled
// 'consultation.appointment.cancelled' event that decline() deliberately
// does NOT dispatch (see Appointment.decline()'s own comment). Mirrors
// NotifyPatientOfAppointmentCancelledHandler's exact shape; closed alongside
// the Phase 0 expiry-notification gap since it's the same small, contained
// pattern.
export class NotifyPatientOfAppointmentDeclinedHandler {
  constructor(
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly preferenceGate: NotificationPreferenceGate,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AppointmentDeclinedEventPayload): Promise<void> {
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

      const description = event.reason
        ? `Your doctor declined your appointment request: ${event.reason}`
        : 'Your doctor declined your appointment request.';

      const notification = Notification.create({
        accountId: patientProfile.getAccountId(),
        title: 'Appointment request declined',
        description,
        actionUrl: '/patient/appointments',
        category: NotificationCategory.Appointments,
        entityType: NotificationEntityType.Appointment,
        entityId: appointment.getId(),
      });
      await this.notificationRepository.save(notification);

      // I3 -- Notification delivery channels. Reuses AuthenticationModule's
      // own EMAIL_SENDER port, never a second email-sending path. PHI-light
      // by construction -- no reason for visit or other clinical detail.
      const account = await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() });
      if (account && (await this.preferenceGate.isEmailEnabled(patientProfile.getAccountId(), NotificationCategory.Appointments))) {
        await this.emailSender.send(
          account.getEmail().toString(),
          'appointment-declined',
          { reason: event.reason },
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // DeclineAppointmentUseCase, which has already saved the appointment
      // by the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify the patient of a declined appointment request',
        error instanceof Error ? error.stack : String(error),
        { appointmentId: event.appointmentId },
      );
    }
  }
}
