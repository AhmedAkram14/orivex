import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { ListAccountsQuery } from '../../../identity/application/use-cases/list-accounts/list-accounts.query.js';
import type { ListAccountsUseCase } from '../../../identity/application/use-cases/list-accounts/list-accounts.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface VerificationCaseSubmittedEventPayload {
  verificationCaseId: string;
  subjectAccountId: string;
  subjectType: 'doctor' | 'patient';
}

// A Super Admin previously had no way to learn a new verification
// application existed short of polling the review queue -- nothing was ever
// raised when a case was submitted (only on Approved). NotificationModule
// reacting to TrustModule's 'verification.case.submitted' event by name
// only (mirrors NotifyConsultationCompletedHandler's exact shape) -- fans
// out to every SuperAdmin account, since a review-queue application is
// everyone-with-that-role's concern, not a single recipient's (the first
// fan-out notification in this codebase; every other handler here is 1:1).
export class NotifyAdminsOfVerificationSubmittedHandler {
  constructor(
    private readonly listAccountsUseCase: ListAccountsUseCase,
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: VerificationCaseSubmittedEventPayload): Promise<void> {
    try {
      const { accounts } = await this.listAccountsUseCase.execute(
        new ListAccountsQuery({ page: 1, limit: 1000, role: AccountRole.SuperAdmin }),
      );
      if (accounts.length === 0) {
        return;
      }

      const title = 'New verification application submitted';
      const description =
        event.subjectType === 'doctor'
          ? 'A doctor has submitted their professional verification for review.'
          : 'A patient has submitted their identity verification for review.';
      const actionUrl = `/admin/verification-queue/${event.verificationCaseId}`;

      await Promise.all(
        accounts.map((account) =>
          this.notificationRepository.save(
            Notification.create({ accountId: account.getId().toString(), title, description, actionUrl }),
          ),
        ),
      );
    } catch (error) {
      // A notification failure must never surface back through
      // SubmitDoctorVerificationUseCase/SubmitPatientVerificationUseCase,
      // which have already saved the case by the time domain events
      // dispatch (same tolerance as every other handler in this module).
      this.logger.error(
        'Failed to notify Super Admins of a submitted verification case',
        error instanceof Error ? error.stack : String(error),
        { verificationCaseId: event.verificationCaseId },
      );
    }
  }
}
