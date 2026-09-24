import { describe, expect, it } from 'vitest';

import type { NotificationEntry } from '@/features/notifications/api/types';
import { localizeIsoTimestamps, resolveNotificationHref } from '@/features/notifications/lib/notification-text';

// Minimal stand-in for next-intl's formatter: only `dateTime` is used.
const format = { dateTime: (date: Date) => `FMT(${date.toISOString().slice(0, 10)})` } as never;

const base: NotificationEntry = { id: 'n', title: 't', description: 'd', severity: 'info', createdAt: '2026-09-24T10:00:00Z', read: false };

describe('localizeIsoTimestamps', () => {
  it('replaces a raw ISO timestamp with the formatted date', () => {
    const out = localizeIsoTimestamps('Your appointment is scheduled for 2026-09-12T16:00:00.000Z.', format);
    expect(out).toBe('Your appointment is scheduled for FMT(2026-09-12).');
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('leaves text without timestamps untouched', () => {
    expect(localizeIsoTimestamps('Your doctor has approved your request.', format)).toBe('Your doctor has approved your request.');
  });
});

describe('resolveNotificationHref', () => {
  it('deep-links an appointment notification to its row', () => {
    expect(resolveNotificationHref({ ...base, entityType: 'appointment', entityId: 'a1', actionUrl: '/patient/appointments' })).toBe(
      '/patient/appointments?highlight=a1',
    );
  });

  it('sends a doctor appointment notification to the Appointments row instead of the today-only Queue', () => {
    expect(resolveNotificationHref({ ...base, entityType: 'appointment', entityId: 'a1', actionUrl: '/doctor/queue' })).toBe('/doctor/appointments?highlight=a1');
  });

  it('keeps the server actionUrl for other entity types and when no entity is referenced', () => {
    expect(resolveNotificationHref({ ...base, entityType: 'consultation', entityId: 'c1', actionUrl: '/patient/appointments?consultationSessionId=c1' })).toBe(
      '/patient/appointments?consultationSessionId=c1',
    );
    expect(resolveNotificationHref(base)).toBeUndefined();
  });
});
