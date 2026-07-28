import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface PasswordChangedEventPayload {
  accountId: string;
}

// A security-relevant notification -- if an attacker changed the password,
// the real owner needs to see this even if they can no longer log in to
// check. PasswordChangedEvent already carries accountId directly.
export class NotifyOfPasswordChangedHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: PasswordChangedEventPayload): Promise<void> {
    try {
      const notification = Notification.create({
        accountId: event.accountId,
        title: 'Password changed',
        description: 'Your password was changed successfully. If this wasn’t you, secure your account immediately.',
        actionUrl: '/security',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through the
      // password-change use case, which has already saved the new
      // credential by the time domain events dispatch (same tolerance as
      // every other handler in this module).
      this.logger.error(
        'Failed to notify the account of its own password change',
        error instanceof Error ? error.stack : String(error),
        { accountId: event.accountId },
      );
    }
  }
}
