import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import { ListNotificationsForAccountUseCase } from './list-notifications-for-account.use-case.js';

class FakeNotificationRepository implements NotificationRepository {
  constructor(private readonly notifications: Notification[]) {}
  async findById(): Promise<Notification | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<Notification[]> {
    return this.notifications.filter((n) => n.getAccountId() === accountId);
  }
  async findByAccountIdPage(accountId: string, skip: number, take: number): Promise<Notification[]> {
    return this.notifications.filter((n) => n.getAccountId() === accountId).slice(skip, skip + take);
  }
  async countByAccountId(accountId: string): Promise<number> {
    return this.notifications.filter((n) => n.getAccountId() === accountId).length;
  }
  async save(): Promise<void> {}
}

describe('ListNotificationsForAccountUseCase', () => {
  it('returns only the notifications belonging to the given account', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const otherAccountId = '22222222-2222-4222-8222-222222222222';
    const mine = Notification.create({ accountId, title: 'Appointment confirmed', description: 'Your visit is confirmed.' });
    const theirs = Notification.create({ accountId: otherAccountId, title: 'Not yours', description: 'Should not appear.' });
    const useCase = new ListNotificationsForAccountUseCase(new FakeNotificationRepository([mine, theirs]));

    const result = await useCase.execute({ accountId, page: 1, limit: 50 });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.getId(), mine.getId());
    assert.equal(result.total, 1);
  });

  it('returns an empty array (not a thrown error) when the account has no notifications', async () => {
    const useCase = new ListNotificationsForAccountUseCase(new FakeNotificationRepository([]));

    const result = await useCase.execute({ accountId: '99999999-9999-4999-8999-999999999999', page: 1, limit: 50 });

    assert.deepEqual(result.items, []);
    assert.equal(result.total, 0);
  });

  it('scopes to a page window when page/limit are given', async () => {
    const accountId = '33333333-3333-4333-8333-333333333333';
    const notifications = Array.from({ length: 5 }, (_, i) =>
      Notification.create({ accountId, title: `Notice ${i}`, description: 'desc' }),
    );
    const useCase = new ListNotificationsForAccountUseCase(new FakeNotificationRepository(notifications));

    const result = await useCase.execute({ accountId, page: 2, limit: 2 });

    assert.equal(result.items.length, 2);
    assert.equal(result.total, 5);
  });
});
