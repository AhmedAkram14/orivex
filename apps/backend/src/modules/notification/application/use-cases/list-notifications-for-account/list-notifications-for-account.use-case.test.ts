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
  async save(): Promise<void> {}
}

describe('ListNotificationsForAccountUseCase', () => {
  it('returns only the notifications belonging to the given account', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const otherAccountId = '22222222-2222-4222-8222-222222222222';
    const mine = Notification.create({ accountId, title: 'Appointment confirmed', description: 'Your visit is confirmed.' });
    const theirs = Notification.create({ accountId: otherAccountId, title: 'Not yours', description: 'Should not appear.' });
    const useCase = new ListNotificationsForAccountUseCase(new FakeNotificationRepository([mine, theirs]));

    const result = await useCase.execute({ accountId });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.getId(), mine.getId());
  });

  it('returns an empty array (not a thrown error) when the account has no notifications', async () => {
    const useCase = new ListNotificationsForAccountUseCase(new FakeNotificationRepository([]));

    const result = await useCase.execute({ accountId: '99999999-9999-4999-8999-999999999999' });

    assert.deepEqual(result, []);
  });
});
