import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationCategory } from '../enums/notification-category.enum.js';
import { NotificationChannel } from '../enums/notification-channel.enum.js';
import { NotificationDomainError } from '../exceptions/notification-domain.error.js';

import { NotificationPreference } from './notification-preference.entity.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('NotificationPreference', () => {
  it('create() defaults every channel to enabled', () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });

    assert.equal(preference.getAccountId(), ACCOUNT_ID);
    assert.equal(preference.getEmailAppointments(), true);
    assert.equal(preference.getEmailBilling(), true);
    assert.equal(preference.getInAppAppointments(), true);
    assert.equal(preference.getInAppBilling(), true);
  });

  it('create() rejects an empty accountId', () => {
    assert.throws(() => NotificationPreference.create({ accountId: '' }), NotificationDomainError);
  });

  it('reconstitute() rehydrates every field as given', () => {
    const now = new Date();
    const preference = NotificationPreference.reconstitute({
      id: '22222222-2222-4222-8222-222222222222',
      accountId: ACCOUNT_ID,
      emailAppointments: false,
      emailBilling: true,
      inAppAppointments: true,
      inAppBilling: false,
      createdAt: now,
      updatedAt: now,
    });

    assert.equal(preference.getEmailAppointments(), false);
    assert.equal(preference.getEmailBilling(), true);
    assert.equal(preference.getInAppAppointments(), true);
    assert.equal(preference.getInAppBilling(), false);
  });

  it('updateChannel() toggles the exact category/channel pair and leaves the rest untouched', () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });

    preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.Email, false);

    assert.equal(preference.getEmailAppointments(), false);
    assert.equal(preference.getEmailBilling(), true);
    assert.equal(preference.getInAppAppointments(), true);
    assert.equal(preference.getInAppBilling(), true);
  });

  it('updateChannel() covers all four category/channel combinations', () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });

    preference.updateChannel(NotificationCategory.Billing, NotificationChannel.Email, false);
    preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.InApp, false);
    preference.updateChannel(NotificationCategory.Billing, NotificationChannel.InApp, false);

    assert.equal(preference.getEmailBilling(), false);
    assert.equal(preference.getInAppAppointments(), false);
    assert.equal(preference.getInAppBilling(), false);
    // Untouched.
    assert.equal(preference.getEmailAppointments(), true);
  });

  it('isChannelEnabled() reflects the current state for each category/channel pair', () => {
    const preference = NotificationPreference.create({ accountId: ACCOUNT_ID });

    assert.equal(preference.isChannelEnabled(NotificationCategory.Appointments, NotificationChannel.Email), true);

    preference.updateChannel(NotificationCategory.Appointments, NotificationChannel.Email, false);

    assert.equal(preference.isChannelEnabled(NotificationCategory.Appointments, NotificationChannel.Email), false);
    assert.equal(preference.isChannelEnabled(NotificationCategory.Billing, NotificationChannel.InApp), true);
  });
});
