import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import { MarkAllNotificationsReadCommand } from './mark-all-notifications-read.command.js';
import { MarkAllNotificationsReadUseCase } from './mark-all-notifications-read.use-case.js';

class FakeNotificationRepository implements NotificationRepository {
  private readonly byId = new Map<string, Notification>();
  constructor(notifications: Notification[]) {
    for (const notification of notifications) {
      this.byId.set(notification.getId(), notification);
    }
  }
  async findById(id: string): Promise<Notification | null> {
    return this.byId.get(id) ?? null;
  }
  async findByAccountId(accountId: string): Promise<Notification[]> {
    return Array.from(this.byId.values()).filter((n) => n.getAccountId() === accountId);
  }
  async save(notification: Notification): Promise<void> {
    this.byId.set(notification.getId(), notification);
  }
}

describe('MarkAllNotificationsReadUseCase', () => {
  it('marks every unread notification for the account as read', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const first = Notification.create({ accountId, title: 'One', description: 'First' });
    const second = Notification.create({ accountId, title: 'Two', description: 'Second' });
    const repository = new FakeNotificationRepository([first, second]);
    const useCase = new MarkAllNotificationsReadUseCase(repository);

    const result = await useCase.execute(new MarkAllNotificationsReadCommand({ accountId }));

    assert.equal(result.length, 2);
    assert.ok(result.every((n) => n.isRead()));
  });

  it('returns an empty array (not a thrown error) when the account has no notifications', async () => {
    const useCase = new MarkAllNotificationsReadUseCase(new FakeNotificationRepository([]));

    const result = await useCase.execute(
      new MarkAllNotificationsReadCommand({ accountId: '99999999-9999-4999-8999-999999999999' }),
    );

    assert.deepEqual(result, []);
  });
});
