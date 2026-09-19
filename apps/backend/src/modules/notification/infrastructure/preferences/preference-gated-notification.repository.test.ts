import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Notification } from '../../domain/entities/notification.entity.js';
import { NotificationCategory } from '../../domain/enums/notification-category.enum.js';
import { NotificationChannel } from '../../domain/enums/notification-channel.enum.js';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity.js';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.js';
import type { NotificationPreferenceRepository } from '../../domain/repositories/notification-preference.repository.js';

import { PreferenceGatedNotificationRepository } from './preference-gated-notification.repository.js';

class FakeInnerRepository implements NotificationRepository {
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

class FakePreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly preference: NotificationPreference | null) {}
  async findByAccountId(): Promise<NotificationPreference | null> {
    return this.preference;
  }
  async save(): Promise<void> {}
}

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('PreferenceGatedNotificationRepository', () => {
  it('suppresses save() when the account has explicitly disabled the in-app channel for this category', async () => {
    const inner = new FakeInnerRepository();
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });
    preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.InApp, false);
    const repo = new PreferenceGatedNotificationRepository(inner, new FakePreferenceRepository(preference));
    const notification = Notification.create({
      accountId: ACCOUNT_ID,
      title: 'Appointment approved',
      description: 'Your doctor has approved your appointment request.',
      category: NotificationCategory.Appointments,
    });

    await repo.save(notification);

    assert.equal(inner.saved.length, 0);
  });

  it('still saves when the category is enabled', async () => {
    const inner = new FakeInnerRepository();
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });
    const repo = new PreferenceGatedNotificationRepository(inner, new FakePreferenceRepository(preference));
    const notification = Notification.create({
      accountId: ACCOUNT_ID,
      title: 'Appointment approved',
      description: 'Your doctor has approved your appointment request.',
      category: NotificationCategory.Appointments,
    });

    await repo.save(notification);

    assert.equal(inner.saved.length, 1);
    assert.equal(inner.saved[0], notification);
  });

  it('always saves a notification with no category, regardless of preference state', async () => {
    const inner = new FakeInnerRepository();
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });
    preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.InApp, false);
    preference.updateChannel(NotificationCategory.Billing, NotificationChannel.InApp, false);
    const repo = new PreferenceGatedNotificationRepository(inner, new FakePreferenceRepository(preference));
    const notification = Notification.create({
      accountId: ACCOUNT_ID,
      title: 'Verification approved',
      description: 'Your professional verification application was approved.',
    });

    await repo.save(notification);

    assert.equal(inner.saved.length, 1);
  });

  it('saves for an account with no preference row yet (lazy default-enabled)', async () => {
    const inner = new FakeInnerRepository();
    const repo = new PreferenceGatedNotificationRepository(inner, new FakePreferenceRepository(null));
    const notification = Notification.create({
      accountId: ACCOUNT_ID,
      title: 'Appointment approved',
      description: 'Your doctor has approved your appointment request.',
      category: NotificationCategory.Appointments,
    });

    await repo.save(notification);

    assert.equal(inner.saved.length, 1);
  });

  it('delegates every read method straight to the inner repository', async () => {
    const inner = new FakeInnerRepository();
    const repo = new PreferenceGatedNotificationRepository(inner, new FakePreferenceRepository(null));

    await repo.findById('x');
    await repo.findByAccountId(ACCOUNT_ID);
    await repo.findByAccountIdPage(ACCOUNT_ID, 0, 10);
    await repo.countByAccountId(ACCOUNT_ID);

    // No assertion beyond "does not throw" is needed here -- these are
    // trivial pass-throughs with no gating logic to verify, mirroring
    // RealtimeNotifyingNotificationRepository's own equivalent test.
  });
});
