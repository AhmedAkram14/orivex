import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyOfPasswordChangedHandler } from './notify-of-password-changed.handler.js';

class FakeNotificationRepository implements NotificationRepository {
  public saved: Notification[] = [];
  async findById(): Promise<Notification | null> {
    return null;
  }
  async findByAccountId(): Promise<Notification[]> {
    return [];
  }
  async findByAccountIdPage(): Promise<Notification[]> {
    return [];
  }
  async countByAccountId(): Promise<number> {
    return 0;
  }
  async save(notification: Notification): Promise<void> {
    this.saved.push(notification);
  }
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('NotifyOfPasswordChangedHandler', () => {
  it('notifies the account with a security-relevant password-changed message', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyOfPasswordChangedHandler(notificationRepo, logger as never);

    await handler.handle({ accountId: ACCOUNT_ID });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), ACCOUNT_ID);
    assert.equal(notification.getTitle(), 'Password changed');
    assert.equal(notification.getActionUrl(), '/security');
    assert.equal(logger.errors.length, 0);
  });

  it('logs (and never throws) when saving fails', async () => {
    class ThrowingNotificationRepository extends FakeNotificationRepository {
      async save(): Promise<void> {
        throw new Error('database unavailable');
      }
    }
    const notificationRepo = new ThrowingNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyOfPasswordChangedHandler(notificationRepo, logger as never);

    await handler.handle({ accountId: ACCOUNT_ID });

    assert.equal(logger.errors.length, 1);
  });
});
