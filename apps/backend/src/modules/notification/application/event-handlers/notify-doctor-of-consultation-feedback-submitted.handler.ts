import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import type { GetConsultationFeedbackForSessionUseCase } from '../../../consultation/application/use-cases/get-consultation-feedback-for-session/get-consultation-feedback-for-session.use-case.js';
import type { GetDoctorProfileByIdUseCase } from '../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import type { GetPatientProfileByIdUseCase } from '../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { GetAccountByIdUseCase } from '../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface ConsultationFeedbackSubmittedEventPayload {
  consultationFeedbackId: string;
  doctorId: string;
  consultationSessionId: string;
}

// The one intentionally-flagged gap in the notification system --
// ConsultationFeedbackSubmittedEvent's own comment already said "Notification
// module can subscribe to this to tell the doctor feedback was received,"
// but nothing ever did. Reacts to ConsultationModule's already-published
// 'consultation.feedback.submitted' event by name only, mirroring every
// other handler's cross-module boundary (e.g.
// NotifyDoctorOfAppointmentRequestedHandler). Deliberately minimal payload:
// rating + optional comment + when, never patient contact info or clinical
// data -- the doctor doesn't need more than "who and what" to go look at
// their real review.
export class NotifyDoctorOfConsultationFeedbackSubmittedHandler {
  constructor(
    private readonly getConsultationFeedbackForSessionUseCase: GetConsultationFeedbackForSessionUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
    private readonly getAccountByIdUseCase: GetAccountByIdUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: ConsultationFeedbackSubmittedEventPayload): Promise<void> {
    try {
      const feedback = await this.getConsultationFeedbackForSessionUseCase.execute({
        consultationSessionId: event.consultationSessionId,
      });
      if (!feedback) {
        return;
      }

      const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: feedback.getDoctorId() });
      if (!doctorProfile) {
        return;
      }

      const patientProfile = await this.getPatientProfileByIdUseCase.execute({
        patientProfileId: feedback.getPatientId(),
      });
      const patientAccount = patientProfile
        ? await this.getAccountByIdUseCase.execute({ accountId: patientProfile.getAccountId() })
        : null;
      const patientName = patientAccount?.getUserProfile().getDisplayName().toString() ?? 'A patient';

      const comment = feedback.getComment();
      const description = comment
        ? `${patientName} rated their consultation ${feedback.getRating()}/5: "${comment}"`
        : `${patientName} rated their consultation ${feedback.getRating()}/5.`;

      // Deep-links straight to the reviewing patient's own chart (the
      // Doctor-facing Patient Profile's real destination) when we could
      // resolve their profile -- falls back to the doctor's own profile
      // (where reviews are also shown) only in the unlikely case a
      // patient profile no longer exists.
      const actionUrl = patientProfile ? `/doctor/patients/${patientProfile.getId()}` : '/doctor/profile';

      const notification = Notification.create({
        accountId: doctorProfile.getAccountId(),
        title: 'New consultation review',
        description,
        actionUrl,
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // SubmitConsultationFeedbackUseCase, which has already saved the
      // feedback by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the doctor of a new consultation review',
        error instanceof Error ? error.stack : String(error),
        { consultationFeedbackId: event.consultationFeedbackId },
      );
    }
  }
}
