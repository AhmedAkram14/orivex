import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyApplicantOfVerificationSuspensionHandler } from './notify-applicant-of-verification-suspension.handler.js';

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

describe('NotifyApplicantOfVerificationSuspensionHandler', () => {
  it('notifies a doctor applicant of a suspension, including the reason and the doctor onboarding route', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyApplicantOfVerificationSuspensionHandler(notificationRepo, logger as never);

    await handler.handle({
      verificationCaseId: VERIFICATION_CASE_ID,
      subjectAccountId: SUBJECT_ACCOUNT_ID,
      subjectType: 'doctor',
      reason: 'License lapsed',
    });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), SUBJECT_ACCOUNT_ID);
    assert.equal(notification.getTitle(), 'Verification suspended');
    assert.match(notification.getDescription(), /professional verification/);
    assert.match(notification.getDescription(), /License lapsed/);
    assert.equal(notification.getActionUrl(), '/doctor/onboarding');
    assert.equal(logger.errors.length, 0);
  });

  it('notifies a patient applicant of a suspension, with distinct copy and the patient verification route', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyApplicantOfVerificationSuspensionHandler(notificationRepo, logger as never);

    await handler.handle({
      verificationCaseId: VERIFICATION_CASE_ID,
      subjectAccountId: SUBJECT_ACCOUNT_ID,
      subjectType: 'patient',
      reason: 'Compliance review finding',
    });

    const notification = notificationRepo.saved[0];
    assert.match(notification.getDescription(), /identity verification/);
    assert.equal(notification.getActionUrl(), '/patient/verify-identity');
  });

  it('logs (and never throws) when saving the notification fails', async () => {
    class ThrowingNotificationRepository extends FakeNotificationRepository {
      async save(): Promise<void> {
        throw new Error('database unavailable');
      }
    }
    const notificationRepo = new ThrowingNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyApplicantOfVerificationSuspensionHandler(notificationRepo, logger as never);

    await handler.handle({
      verificationCaseId: VERIFICATION_CASE_ID,
      subjectAccountId: SUBJECT_ACCOUNT_ID,
      subjectType: 'doctor',
      reason: 'License lapsed',
    });

    assert.equal(logger.errors.length, 1);
  });
});
