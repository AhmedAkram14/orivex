import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyOfDoctorRolePromotionHandler } from './notify-of-doctor-role-promotion.handler.js';

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

const SUBJECT_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const VERIFICATION_CASE_ID = '22222222-2222-4222-8222-222222222222';

describe('NotifyOfDoctorRolePromotionHandler', () => {
  it('notifies the newly-promoted doctor, pointing at the real doctor workspace route', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyOfDoctorRolePromotionHandler(notificationRepo, logger as never);

    await handler.handle({ subjectAccountId: SUBJECT_ACCOUNT_ID, verificationCaseId: VERIFICATION_CASE_ID });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), SUBJECT_ACCOUNT_ID);
    assert.equal(notification.getTitle(), 'Welcome, Doctor');
    assert.match(notification.getDescription(), /Doctor Workspace access/);
    assert.equal(notification.getActionUrl(), '/doctor');
    assert.equal(logger.errors.length, 0);
  });

  it('logs (and never throws) when saving the notification fails', async () => {
    class ThrowingNotificationRepository extends FakeNotificationRepository {
      async save(): Promise<void> {
        throw new Error('database unavailable');
      }
    }
    const notificationRepo = new ThrowingNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyOfDoctorRolePromotionHandler(notificationRepo, logger as never);

    await handler.handle({ subjectAccountId: SUBJECT_ACCOUNT_ID, verificationCaseId: VERIFICATION_CASE_ID });

    assert.equal(logger.errors.length, 1);
  });
});
