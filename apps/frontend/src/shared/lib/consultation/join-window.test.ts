import { describe, expect, it } from 'vitest';
import { canJoinCall } from './join-window';

describe('canJoinCall', () => {
  it('is false more than 30 minutes before the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T09:29:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(false);
  });

  it('is true exactly 30 minutes before the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T09:30:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(true);
  });

  it('is true at the scheduled time itself', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), new Date(scheduledAt))).toBe(true);
  });

  it('is true up to exactly 30 minutes after the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T10:30:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(true);
  });

  it('is false more than 30 minutes after the scheduled time', () => {
    const scheduledAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T10:31:00.000Z');
    expect(canJoinCall(scheduledAt.toISOString(), now)).toBe(false);
  });
});
