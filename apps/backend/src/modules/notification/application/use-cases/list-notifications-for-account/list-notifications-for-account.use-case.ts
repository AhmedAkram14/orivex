import type { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import type { ListNotificationsForAccountQuery } from './list-notifications-for-account.query.js';

// Pure read — mirrors ListAppointmentsForPatientUseCase's pattern.
export class ListNotificationsForAccountUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(query: ListNotificationsForAccountQuery): Promise<Notification[]> {
    return this.notificationRepository.findByAccountId(query.accountId);
  }
}
