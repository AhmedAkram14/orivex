import type { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import type { ListNotificationsForAccountQuery } from './list-notifications-for-account.query.js';

export interface ListNotificationsForAccountResult {
  items: Notification[];
  total: number;
}

// Pure read — mirrors ListAppointmentsForPatientUseCase's pattern, paginated
// (Production Readiness Audit -- an account's notification history grows
// unboundedly over its lifetime, unlike most of this codebase's other
// "my own list" endpoints).
export class ListNotificationsForAccountUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(query: ListNotificationsForAccountQuery): Promise<ListNotificationsForAccountResult> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.notificationRepository.findByAccountIdPage(query.accountId, skip, query.limit),
      this.notificationRepository.countByAccountId(query.accountId),
    ]);
    return { items, total };
  }
}
