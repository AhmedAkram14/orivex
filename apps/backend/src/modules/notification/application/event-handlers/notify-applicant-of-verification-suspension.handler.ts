import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface VerificationCaseSuspendedEventPayload {
  verificationCaseId: string;
  subjectAccountId: string;
  subjectType: 'doctor' | 'patient';
  reason: string;
}

// A doctor/patient whose previously-approved verification was suspended
// (license lapse, a compliance finding) previously had no way to learn
// that short of noticing their access had quietly changed --
// VerificationCase.suspend() raised no event at all before this fix.
// NotificationModule reacting to TrustModule's 'verification.case.suspended'
// event by name only (mirrors NotifyApplicantOfVerificationDecisionHandler's
// exact shape), 1:1 to the single applicant. Deliberately does not touch
// role/authorization: ADR-007's rule that suspension never auto-demotes
// role is enforced elsewhere (or not at all, by design) -- this handler
// only ever produces a notification side-effect.
export class NotifyApplicantOfVerificationSuspensionHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: VerificationCaseSuspendedEventPayload): Promise<void> {
    try {
      const subject = event.subjectType === 'doctor' ? 'professional verification' : 'identity verification';
      const actionUrl = event.subjectType === 'doctor' ? '/doctor/onboarding' : '/patient/verify-identity';

      const notification = Notification.create({
        accountId: event.subjectAccountId,
        title: 'Verification suspended',
        description: `Your ${subject} has been suspended and related access has been revoked. Reason: ${event.reason}`,
        actionUrl,
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // SuspendVerificationCaseUseCase, which has already saved the
      // suspension by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the applicant of a verification suspension',
        error instanceof Error ? error.stack : String(error),
        { verificationCaseId: event.verificationCaseId },
      );
    }
  }
}
