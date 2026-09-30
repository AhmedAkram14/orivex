import { describe, expect, it } from 'vitest';
import type { NotificationEntry } from '@/features/notifications/api/types';
import { isPersonalNotification, NOTIFICATION_AUDIENCE } from './notification-audience';

function entry(title: string, actionUrl?: string): NotificationEntry {
  return { id: '1', title, description: '', severity: 'info', createdAt: '2026-09-01T00:00:00Z', read: false, actionUrl };
}

describe('isPersonalNotification', () => {
  it('never marks anything personal for a patient-only account', () => {
    expect(isPersonalNotification(entry('Appointment approved', '/patient/appointments'), false)).toBe(false);
  });

  it('decides by type first: a patient-only type is personal even without a link', () => {
    expect(isPersonalNotification(entry('New prescription'), true)).toBe(true);
  });

  it('decides by type first: a clinical type stays clinical even if its link points into /patient', () => {
    expect(isPersonalNotification(entry('New appointment request', '/patient/anything'), true)).toBe(false);
  });

  it('keeps account notices out of Personal', () => {
    expect(isPersonalNotification(entry('Password changed', '/patient/profile'), true)).toBe(false);
  });

  it('falls back to the link only for a type sent to both sides', () => {
    expect(isPersonalNotification(entry('Appointment cancelled', '/patient/appointments'), true)).toBe(true);
    expect(isPersonalNotification(entry('Appointment cancelled', '/doctor/appointments'), true)).toBe(false);
  });

  it('falls back to the link for a type the table does not know yet', () => {
    expect(isPersonalNotification(entry('Some future notice', '/patient/x'), true)).toBe(true);
    expect(isPersonalNotification(entry('Some future notice'), true)).toBe(false);
  });

  it('classifies every known notification type', () => {
    // 25 + Verification rejected, More information needed, New verification application submitted (round 4).
    expect(Object.keys(NOTIFICATION_AUDIENCE)).toHaveLength(28);
  });
});
