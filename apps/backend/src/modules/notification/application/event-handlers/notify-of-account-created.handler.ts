import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AccountCreatedEventPayload {
  accountId: string;
}

// A welcome notification -- the account has no other notification yet at
// registration time, so this is also the first thing a new user sees in
// the bell. AccountCreatedEvent already carries accountId directly, no
// cross-module profile lookup needed.
export class NotifyOfAccountCreatedHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AccountCreatedEventPayload): Promise<void> {
    try {
      const notification = Notification.create({
        accountId: event.accountId,
        title: 'Welcome to Orivex',
        description: 'Your account was created successfully.',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through
      // RegisterUseCase, which has already saved the account by the time
      // domain events dispatch (same tolerance as every other handler in
      // this module).
      this.logger.error(
        'Failed to notify a new account of its own creation',
        error instanceof Error ? error.stack : String(error),
        { accountId: event.accountId },
      );
    }
  }
}
