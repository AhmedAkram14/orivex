import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationPreference } from '../../../domain/entities/notification-preference.entity.js';
import type { NotificationPreferenceRepository } from '../../../domain/repositories/notification-preference.repository.js';

import { GetNotificationPreferencesUseCase } from './get-notification-preferences.use-case.js';

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

describe('GetNotificationPreferencesUseCase', () => {
  it('returns an in-memory all-true default without persisting when no row exists', async () => {
    const repository = new FakeNotificationPreferenceRepository();
    const useCase = new GetNotificationPreferencesUseCase(repository);

    const result = await useCase.execute({ accountId: ACCOUNT_ID });

    assert.equal(result.getAccountId(), ACCOUNT_ID);
    assert.equal(result.getEmailAppointments(), true);
    assert.equal(result.getEmailBilling(), true);
    assert.equal(result.getInAppAppointments(), true);
    assert.equal(result.getInAppBilling(), true);
    assert.equal(repository.saveCallCount, 0);
    assert.equal(await repository.findByAccountId(ACCOUNT_ID), null);
  });

  it('returns the persisted row when one already exists', async () => {
    const repository = new FakeNotificationPreferenceRepository();
    const existing = NotificationPreference.reconstitute({
      id: '22222222-2222-4222-8222-222222222222',
      accountId: ACCOUNT_ID,
      emailAppointments: false,
      emailBilling: true,
      inAppAppointments: false,
      inAppBilling: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.seed(existing);
    const useCase = new GetNotificationPreferencesUseCase(repository);

    const result = await useCase.execute({ accountId: ACCOUNT_ID });

    assert.equal(result, existing);
    assert.equal(result.getEmailAppointments(), false);
    assert.equal(result.getInAppBilling(), true);
    assert.equal(repository.saveCallCount, 0);
  });
});
