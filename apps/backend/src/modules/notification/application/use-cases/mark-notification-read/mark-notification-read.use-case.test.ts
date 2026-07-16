import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Notification } from '../../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../../domain/repositories/notification.repository.js';

import { MarkNotificationReadCommand } from './mark-notification-read.command.js';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case.js';

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
  async findByAccountId(): Promise<Notification[]> {
    return [];
  }
  async save(notification: Notification): Promise<void> {
    this.byId.set(notification.getId(), notification);
  }
}

describe('MarkNotificationReadUseCase', () => {
  it('marks the notification as read when it belongs to the caller', async () => {
    const accountId = '11111111-1111-4111-8111-111111111111';
    const notification = Notification.create({ accountId, title: 'Appointment confirmed', description: 'Your visit is confirmed.' });
    const useCase = new MarkNotificationReadUseCase(new FakeNotificationRepository([notification]));

    const result = await useCase.execute(
      new MarkNotificationReadCommand({ notificationId: notification.getId(), accountId }),
    );

    assert.ok(result);
    assert.equal(result.isRead(), true);
  });

  it('returns null (not a thrown error) when the notification does not exist', async () => {
    const useCase = new MarkNotificationReadUseCase(new FakeNotificationRepository([]));

    const result = await useCase.execute(
      new MarkNotificationReadCommand({
        notificationId: '99999999-9999-4999-8999-999999999999',
        accountId: '11111111-1111-4111-8111-111111111111',
      }),
    );

    assert.equal(result, null);
  });

  it('returns null when the notification belongs to a different account', async () => {
    const notification = Notification.create({
      accountId: '11111111-1111-4111-8111-111111111111',
      title: 'Appointment confirmed',
      description: 'Your visit is confirmed.',
    });
    const useCase = new MarkNotificationReadUseCase(new FakeNotificationRepository([notification]));

    const result = await useCase.execute(
      new MarkNotificationReadCommand({
        notificationId: notification.getId(),
        accountId: '22222222-2222-4222-8222-222222222222',
      }),
    );

    assert.equal(result, null);
  });
});
