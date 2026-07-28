import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface VerificationCaseDecidedEventPayload {
  verificationCaseId: string;
  subjectAccountId: string;
  subjectType: 'doctor' | 'patient';
  status: 'approved' | 'rejected' | 'more_info_needed';
  reason?: string;
}

// A doctor/patient whose verification was decided -- approved, rejected, or
// sent back for more info -- previously had no way to learn that short of
// returning to the onboarding wizard and checking (and for Approved
// specifically, nothing was ever raised for this purpose at all; only
// DoctorVerifiedEvent existed, which drives role promotion, not a
// notification). NotificationModule reacting to TrustModule's
// 'verification.case.decided' event by name only (mirrors
// NotifyAdminsOfVerificationSubmittedHandler's exact shape), 1:1 to the
// single applicant this time (not a fan-out).
export class NotifyApplicantOfVerificationDecisionHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: VerificationCaseDecidedEventPayload): Promise<void> {
    try {
      const subject = event.subjectType === 'doctor' ? 'professional verification' : 'identity verification';
      const title =
        event.status === 'approved'
          ? 'Verification approved'
          : event.status === 'rejected'
            ? 'Verification rejected'
            : 'More information needed';
      const base =
        event.status === 'approved'
          ? `Your ${subject} application was approved.`
          : event.status === 'rejected'
            ? `Your ${subject} application was rejected.`
            : `Your ${subject} application needs more information before it can be reviewed.`;
      // The rejection reason is worth surfacing; an approval has none to
      // show, and MoreInfoNeeded's reason already describes what's missing.
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
