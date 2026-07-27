import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface VerificationCaseDecidedEventPayload {
  verificationCaseId: string;
  subjectAccountId: string;
  subjectType: 'doctor' | 'patient';
  status: 'rejected' | 'more_info_needed';
  reason?: string;
}

// A doctor/patient whose verification was rejected or sent back for more
// info previously had no way to learn that short of returning to the
// onboarding wizard and checking -- nothing was ever raised on decide()
// outside the Approved path. NotificationModule reacting to TrustModule's
// 'verification.case.decided' event by name only (mirrors
// NotifyAdminsOfVerificationSubmittedHandler's exact shape), 1:1 to the
// single applicant this time (not a fan-out). Deliberately does not
// subscribe to an Approved-equivalent event -- that path already promotes
// the doctor's role (PromoteDoctorRoleOnVerificationHandler) and the
// applicant sees "Approved" the next time they open the wizard; adding an
// approval notification is a separate, not-yet-requested enhancement.
export class NotifyApplicantOfVerificationDecisionHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: VerificationCaseDecidedEventPayload): Promise<void> {
    try {
      const title = event.status === 'rejected' ? 'Verification rejected' : 'More information needed';
      const subject = event.subjectType === 'doctor' ? 'professional verification' : 'identity verification';
      const base =
        event.status === 'rejected'
          ? `Your ${subject} application was rejected.`
          : `Your ${subject} application needs more information before it can be reviewed.`;
      const description = event.reason ? `${base} Reason: ${event.reason}` : base;
      const actionUrl = event.subjectType === 'doctor' ? '/doctor/onboarding' : '/patient/verify-identity';

      const notification = Notification.create({ accountId: event.subjectAccountId, title, description, actionUrl });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // DecideVerificationUseCase, which has already saved the decision by
      // the time domain events dispatch (same tolerance as every other
      // handler in this module).
      this.logger.error(
        'Failed to notify the applicant of a verification decision',
        error instanceof Error ? error.stack : String(error),
        { verificationCaseId: event.verificationCaseId },
      );
    }
  }
}
