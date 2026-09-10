import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { EmailSenderPort } from '../../../authentication/application/ports/email-sender.port.js';
import { toEmailLocale } from '../../../authentication/infrastructure/email/templates/email-locale.js';
import type { GetAppointmentByIdUseCase } from '../../../consultation/application/use-cases/get-appointment-by-id/get-appointment-by-id.use-case.js';
import type { GetConsultationSessionByIdUseCase } from '../../../consultation/application/use-cases/get-consultation-session-by-id/get-consultation-session-by-id.use-case.js';
import type { GetFollowUpRecommendationForSessionUseCase } from '../../../consultation/application/use-cases/get-follow-up-recommendation-for-session/get-follow-up-recommendation-for-session.use-case.js';
import type { ListPrescriptionsForConsultationSessionUseCase } from '../../../clinical/application/use-cases/list-prescriptions-for-consultation-session/list-prescriptions-for-consultation-session.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface ConsultationCompletedEventPayload {
  consultationSessionId: string;
}

// Plain TypeScript class — no NestJS dependency; subscription wiring lives
// in notification.module.ts only. NotificationModule reacting to
// ConsultationModule's already-published ConsultationCompletedEvent by name
// only (mirrors ScheduleAppointmentReminderHandler's exact shape) --
// ConsultationModule never knows Notification exists. Deliberately does NOT
// subscribe to ConsultationInterruptedEvent: an interrupted call isn't a
// genuine completion worth telling the patient "your consultation is done"
// about (§16 of the consultation-completion-lifecycle fix's own scope --
// "do not spam users").
export class NotifyConsultationCompletedHandler {
  constructor(
    private readonly getConsultationSessionByIdUseCase: GetConsultationSessionByIdUseCase,
    private readonly getAppointmentByIdUseCase: GetAppointmentByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly listPrescriptionsForConsultationSessionUseCase: ListPrescriptionsForConsultationSessionUseCase,
    private readonly getFollowUpRecommendationForSessionUseCase: GetFollowUpRecommendationForSessionUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailSender: EmailSenderPort,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: ConsultationCompletedEventPayload): Promise<void> {
    try {
      const session = await this.getConsultationSessionByIdUseCase.execute({
        consultationSessionId: event.consultationSessionId,
      });
      if (!session) {
        return;
      }

      const appointment = await this.getAppointmentByIdUseCase.execute({ appointmentId: session.getAppointmentId() });
      if (!appointment) {
        return;
      }

      const patient = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: appointment.getPatientId() });
      if (!patient) {
        return;
      }

      const [prescriptions, followUp] = await Promise.all([
        this.listPrescriptionsForConsultationSessionUseCase.execute({
          consultationSessionId: event.consultationSessionId,
        }),
        this.getFollowUpRecommendationForSessionUseCase.execute({
          consultationSessionId: event.consultationSessionId,
        }),
      ]);

      const extras: string[] = [];
      if (prescriptions.length > 0) {
        extras.push('a new prescription is available');
      }
      if (followUp) {
        extras.push('your doctor has recommended a follow-up');
      }
      const description =
        extras.length > 0
          ? `Your consultation is complete -- ${extras.join(', and ')}. Rate your consultation from your appointments history.`
          : 'Your consultation is complete. Rate your consultation from your appointments history.';

      const notification = Notification.create({
        accountId: patient.getAccountId(),
        title: 'Consultation completed',
        description,
        // Deep-links straight to this specific consultation's summary
        // dialog (real consultationSessionId, the same one AppointmentList
        // already keys ConsultationOutcomeAction off of) rather than
        // dropping the patient on the bare appointments list to go find it
        // themselves.
        actionUrl: `/patient/appointments?consultationSessionId=${event.consultationSessionId}`,
      });
      await this.notificationRepository.save(notification);

      // I3 -- Notification delivery channels (docs/01-prd.md's "review
      // requests" email type). Reuses AuthenticationModule's own
      // EMAIL_SENDER port, never a second email-sending path. Deliberately
      // PHI-light -- unlike the in-app notification above, the email never
      // mentions prescriptions/follow-up specifics, just a generic prompt
      // back to the authenticated product.
      const account = await this.getAccountByIdUseCase.execute({ accountId: patient.getAccountId() });
      if (account) {
        await this.emailSender.send(
          account.getEmail().toString(),
          'consultation-completed',
          {},
          toEmailLocale(account.getUserProfile().getPreferredLanguage()),
        );
      }
    } catch (error) {
      // A notification failure must never surface back through
      // CloseConsultationUseCase, which has already saved the session/
      // appointment by the time domain events dispatch (same tolerance as
      // ScheduleAppointmentReminderHandler).
      this.logger.error(
        'Failed to notify patient of consultation completion',
        error instanceof Error ? error.stack : String(error),
        { consultationSessionId: event.consultationSessionId },
      );
    }
  }
}
