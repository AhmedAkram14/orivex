import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationDomainError } from '../../domain/exceptions/notification-domain.error.js';

import { NotConfiguredNotificationQueueAdapter } from './not-configured-notification-queue.adapter.js';

describe('NotConfiguredNotificationQueueAdapter', () => {
  it('throws a NotificationDomainError instead of silently pretending a reminder was scheduled', async () => {
    const adapter = new NotConfiguredNotificationQueueAdapter();

    await assert.rejects(
      () =>
        adapter.enqueueAppointmentReminder({
          accountId: '11111111-1111-4111-8111-111111111111',
          appointmentId: '22222222-2222-4222-8222-222222222222',
          scheduledAt: '2026-08-01T10:00:00.000Z',
          delayMs: 1000,
        }),
      NotificationDomainError,
    );
  });

  it('throws a NotificationDomainError from checkConnectivity() too, rather than reporting a fake healthy status', async () => {
    const adapter = new NotConfiguredNotificationQueueAdapter();

    await assert.rejects(() => adapter.checkConnectivity(), NotificationDomainError);
  });
});
