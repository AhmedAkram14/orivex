import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationCategory } from '../../domain/enums/notification-category.enum.js';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum.js';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity.js';
import type { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository.js';

import { NotificationPreferenceGate } from './notification-preference-gate.service.js';

class FakePreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly preference: NotificationPreference | null) {}
  async findByAccountId(): Promise<NotificationPreference | null> {
    return this.preference;
  }
  async save(): Promise<void> {}
}

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('NotificationPreferenceGate', () => {
  it('reports disabled when the account explicitly disabled the email channel for this category', async () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });
    preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.Email, false);
    const gate = new NotificationPreferenceGate(new FakePreferenceRepository(preference));

    const enabled = await gate.isEmailEnabled(ACCOUNT_ID, NotificationCategory.Appointments);

    assert.equal(enabled, false);
  });

  it('reports enabled when the category is enabled', async () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });
    const gate = new NotificationPreferenceGate(new FakePreferenceRepository(preference));

    const enabled = await gate.isEmailEnabled(ACCOUNT_ID, NotificationCategory.Appointments);

    assert.equal(enabled, true);
  });

  it('a different category being disabled does not affect this one', async () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });
    preference.updateChannel(NotificationCategory.Billing, NotificationChannel.Email, false);
    const gate = new NotificationPreferenceGate(new FakePreferenceRepository(preference));

    const enabled = await gate.isEmailEnabled(ACCOUNT_ID, NotificationCategory.Appointments);

    assert.equal(enabled, true);
  });

  it('reports enabled for an account with no preference row yet (lazy default-enabled)', async () => {
    const gate = new NotificationPreferenceGate(new FakePreferenceRepository(null));

    const enabled = await gate.isEmailEnabled(ACCOUNT_ID, NotificationCategory.Appointments);

    assert.equal(enabled, true);
  });
});
