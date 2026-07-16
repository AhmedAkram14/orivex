import type { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import type { MarkNotificationReadCommand } from './mark-notification-read.command.js';

// Returns null (not a thrown error) both when the notification doesn't
// exist and when it belongs to a different account -- the controller maps
// either case to the same 404, never leaking whether a given id belongs to
// someone else.
export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(command: MarkNotificationReadCommand): Promise<Notification | null> {
    const notification = await this.notificationRepository.findById(command.notificationId);
    if (!notification || notification.getAccountId() !== command.accountId) {
      return null;
    }

    notification.markRead();
    await this.notificationRepository.save(notification);
    return notification;
  }
}
