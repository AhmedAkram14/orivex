import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface DoctorVerifiedEventPayload {
  subjectAccountId: string;
  verificationCaseId: string;
}

// A newly-promoted doctor previously had no way to learn their account now
// has Doctor Portal access short of reloading the app and noticing the nav
// changed -- DoctorModule's PromoteDoctorRoleOnVerificationHandler already
// reacts to TrustModule's 'doctor.verified' event to flip the role, but
// nothing in NotificationModule ever subscribed to the same event.
// NotificationModule reacting to TrustModule's 'doctor.verified' event by
// name only (mirrors PromoteDoctorRoleOnVerificationHandler's own
// cross-module boundary -- TrustModule remains unaware either handler
// exists), 1:1 to the newly-promoted doctor.
export class NotifyOfDoctorRolePromotionHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: DoctorVerifiedEventPayload): Promise<void> {
    try {
      const notification = Notification.create({
        accountId: event.subjectAccountId,
        title: 'Welcome, Doctor',
        description: 'Your verification is approved and your account now has Doctor Workspace access.',
        actionUrl: '/doctor',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through the
      // approval decision that triggered this promotion -- the role change
      // has already been applied by the time domain events dispatch (same
      // tolerance as every other handler in this module).
      this.logger.error(
        'Failed to notify the account of its doctor role promotion',
        error instanceof Error ? error.stack : String(error),
        { subjectAccountId: event.subjectAccountId, verificationCaseId: event.verificationCaseId },
      );
    }
  }
}
