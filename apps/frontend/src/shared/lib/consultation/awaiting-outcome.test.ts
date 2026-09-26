import { describe, expect, it } from 'vitest';
import { isAwaitingOutcome } from './awaiting-outcome';

const now = new Date('2026-09-26T12:00:00.000Z');

describe('isAwaitingOutcome', () => {
  it('is false for anything but a confirmed appointment', () => {
    for (const status of ['requested', 'completed', 'cancelled', 'no_show', 'expired', 'rescheduled']) {
      expect(isAwaitingOutcome({ status, scheduledAt: '2026-09-20T10:00:00.000Z' }, now)).toBe(false);
    }
  });

  it('is false for a confirmed appointment still upcoming or inside its join window', () => {
    expect(isAwaitingOutcome({ status: 'confirmed', scheduledAt: '2026-09-27T10:00:00.000Z' }, now)).toBe(false);
    expect(isAwaitingOutcome({ status: 'confirmed', scheduledAt: '2026-09-26T11:45:00.000Z' }, now)).toBe(false);
  });

  it('is true once the slot end and the join window have both passed', () => {
    expect(isAwaitingOutcome({ status: 'confirmed', scheduledAt: '2026-09-26T09:00:00.000Z' }, now)).toBe(true);
    expect(
      isAwaitingOutcome(
        { status: 'confirmed', scheduledAt: '2026-09-26T09:00:00.000Z', endTime: '2026-09-26T09:30:00.000Z' },
        now,
      ),
    ).toBe(true);
  });

  it('honours a booked window that ends after the join window closes', () => {
    expect(
      isAwaitingOutcome(
        { status: 'confirmed', scheduledAt: '2026-09-26T10:00:00.000Z', endTime: '2026-09-26T12:30:00.000Z' },
        now,
      ),
    ).toBe(false);
  });
});
