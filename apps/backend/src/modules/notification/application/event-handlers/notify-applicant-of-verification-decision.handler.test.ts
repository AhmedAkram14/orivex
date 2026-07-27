import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Notification } from '../../domain/entities/notification.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';

import { NotifyApplicantOfVerificationDecisionHandler } from './notify-applicant-of-verification-decision.handler.js';

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

describe('NotifyApplicantOfVerificationDecisionHandler', () => {
  it('notifies the applicant of a rejection, including the reason', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyApplicantOfVerificationDecisionHandler(notificationRepo, logger as never);

    await handler.handle({
      verificationCaseId: '22222222-2222-4222-8222-222222222222',
      subjectAccountId: SUBJECT_ACCOUNT_ID,
      subjectType: 'doctor',
      status: 'rejected',
      reason: 'The submitted license number could not be verified.',
    });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getAccountId(), SUBJECT_ACCOUNT_ID);
    assert.equal(notification.getTitle(), 'Verification rejected');
    assert.match(notification.getDescription(), /rejected/);
    assert.match(notification.getDescription(), /The submitted license number could not be verified\./);
    assert.equal(notification.getActionUrl(), '/doctor/onboarding');
    assert.equal(logger.errors.length, 0);
  });

  it('notifies a patient applicant of a more-info-needed decision, with distinct copy from rejection', async () => {
    const notificationRepo = new FakeNotificationRepository();
    const logger = new FakeLogger();
    const handler = new NotifyApplicantOfVerificationDecisionHandler(notificationRepo, logger as never);

    await handler.handle({
      verificationCaseId: '22222222-2222-4222-8222-222222222222',
      subjectAccountId: SUBJECT_ACCOUNT_ID,
      subjectType: 'patient',
      status: 'more_info_needed',
    });

    assert.equal(notificationRepo.saved.length, 1);
    const notification = notificationRepo.saved[0];
    assert.equal(notification.getTitle(), 'More information needed');
    assert.match(notification.getDescription(), /identity verification/);
    assert.doesNotMatch(notification.getDescription(), /Reason:/);
    assert.equal(notification.getActionUrl(), '/patient/verify-identity');
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
    const handler = new NotifyApplicantOfVerificationDecisionHandler(notificationRepo, logger as never);

    await handler.handle({
      verificationCaseId: '22222222-2222-4222-8222-222222222222',
      subjectAccountId: SUBJECT_ACCOUNT_ID,
      subjectType: 'doctor',
      status: 'rejected',
    });

    assert.equal(logger.errors.length, 1);
  });
});
