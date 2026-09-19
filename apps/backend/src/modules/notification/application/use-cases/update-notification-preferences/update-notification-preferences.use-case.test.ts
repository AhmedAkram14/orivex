import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationPreference } from '../../../domain/entities/notification-preference.entity.js';
import type { NotificationPreferenceRepository } from '../../../domain/repositories/notification-preference.repository.js';

import { UpdateNotificationPreferencesCommand } from './update-notification-preferences.command.js';
import { UpdateNotificationPreferencesUseCase } from './update-notification-preferences.use-case.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

class FakeNotificationPreferenceRepository implements NotificationPreferenceRepository {
  private readonly byAccountId = new Map<string, NotificationPreference>();
  saveCallCount = 0;

  seed(preference: NotificationPreference): void {
    this.byAccountId.set(preference.getAccountId(), preference);
  }

  async findByAccountId(accountId: string): Promise<NotificationPreference | null> {
    return this.byAccountId.get(accountId) ?? null;
  }

  async save(preference: NotificationPreference): Promise<void> {
    this.saveCallCount += 1;
    this.byAccountId.set(preference.getAccountId(), preference);
  }
}

describe('UpdateNotificationPreferencesUseCase', () => {
  it('creates a new row (all-true defaults) when none exists, then applies only the provided fields', async () => {
    const repository = new FakeNotificationPreferenceRepository();
    const useCase = new UpdateNotificationPreferencesUseCase(repository);

    const result = await useCase.execute(
      new UpdateNotificationPreferencesCommand({ accountId: ACCOUNT_ID, emailAppointments: false }),
    );

    assert.equal(result.getAccountId(), ACCOUNT_ID);
    assert.equal(result.getEmailAppointments(), false);
    assert.equal(result.getEmailBilling(), true);
    assert.equal(result.getInAppAppointments(), true);
    assert.equal(result.getInAppBilling(), true);
    assert.equal(repository.saveCallCount, 1);
    assert.equal(await repository.findByAccountId(ACCOUNT_ID), result);
  });

  it('updates an existing row in place without clobbering fields the caller did not send', async () => {
    const repository = new FakeNotificationPreferenceRepository();
    const existing = NotificationPreference.reconstitute({
      id: '22222222-2222-4222-8222-222222222222',
      accountId: ACCOUNT_ID,
      emailAppointments: true,
      emailBilling: true,
      inAppAppointments: true,
      inAppBilling: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.seed(existing);
    const useCase = new UpdateNotificationPreferencesUseCase(repository);

    const result = await useCase.execute(
      new UpdateNotificationPreferencesCommand({ accountId: ACCOUNT_ID, inAppBilling: false }),
    );

    assert.equal(result.getInAppBilling(), false);
    // Untouched -- a partial PATCH must never clobber the other channels.
    assert.equal(result.getEmailAppointments(), true);
    assert.equal(result.getEmailBilling(), true);
    assert.equal(result.getInAppAppointments(), true);
    assert.equal(repository.saveCallCount, 1);
  });

  it('applying no fields at all leaves every channel at its current value', async () => {
    const repository = new FakeNotificationPreferenceRepository();
    const existing = NotificationPreference.reconstitute({
      id: '33333333-3333-4333-8333-333333333333',
      accountId: ACCOUNT_ID,
      emailAppointments: false,
      emailBilling: false,
      inAppAppointments: false,
      inAppBilling: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.seed(existing);
    const useCase = new UpdateNotificationPreferencesUseCase(repository);

    const result = await useCase.execute(new UpdateNotificationPreferencesCommand({ accountId: ACCOUNT_ID }));

    assert.equal(result.getEmailAppointments(), false);
    assert.equal(result.getEmailBilling(), false);
    assert.equal(result.getInAppAppointments(), false);
    assert.equal(result.getInAppBilling(), false);
    assert.equal(repository.saveCallCount, 1);
  });
});
