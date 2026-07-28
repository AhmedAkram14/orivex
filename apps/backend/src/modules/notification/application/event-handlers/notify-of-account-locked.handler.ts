import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

export interface AccountLockedEventPayload {
  accountId: string;
  // The dispatcher is in-process (no serialization boundary -- see
  // InProcessDomainEventDispatcher's own comment), so this arrives as the
  // real Date instance AccountLockedEvent itself carries, never a string.
  lockedUntil: Date;
}

// A security-relevant notification -- an account lockout (too many failed
// login attempts) is exactly the kind of event whose owner needs to know,
// whether it was them mistyping a password or someone else trying to break
// in. AccountLockedEvent already carries accountId directly.
export class NotifyOfAccountLockedHandler {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: AccountLockedEventPayload): Promise<void> {
    try {
      const notification = Notification.create({
        accountId: event.accountId,
        title: 'Account temporarily locked',
        description: `Too many failed sign-in attempts. Your account is locked until ${event.lockedUntil.toLocaleString()}.`,
        actionUrl: '/security',
      });
      await this.notificationRepository.save(notification);
    } catch (error) {
      // A notification failure must never surface back through the
      // login use case, which has already saved the lockout state by the
      // time domain events dispatch (same tolerance as every other handler
      // in this module).
      this.logger.error(
        'Failed to notify the account of its own lockout',
        error instanceof Error ? error.stack : String(error),
        { accountId: event.accountId },
      );
    }
  }
}
