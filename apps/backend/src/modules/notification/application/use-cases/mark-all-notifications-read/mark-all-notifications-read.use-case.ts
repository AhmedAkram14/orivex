import type { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import type { MarkAllNotificationsReadCommand } from './mark-all-notifications-read.command.js';

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(command: MarkAllNotificationsReadCommand): Promise<Notification[]> {
    const notifications = await this.notificationRepository.findByAccountId(command.accountId);
    const unread = notifications.filter((notification) => !notification.isRead());

    for (const notification of unread) {
      notification.markRead();
      await this.notificationRepository.save(notification);
    }

    return notifications;
  }
}
