import { describe, expect, it } from 'vitest';
import { canJoinCall } from './appointment-time';

describe('canJoinCall', () => {
  it('is false more than 15 minutes before the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T09:44:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(false);
  });

  it('is true exactly 15 minutes before the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T09:45:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(true);
  });

  it('is true at the scheduled time itself', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), new Date(scheduledAt))).toBe(true);
  });

  it('is true up to exactly 1 hour after the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T11:00:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(true);
  });

  it('is false more than 1 hour after the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T11:01:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(false);
  });
});
