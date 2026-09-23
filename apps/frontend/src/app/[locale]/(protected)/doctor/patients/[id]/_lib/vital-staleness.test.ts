import { describe, expect, it } from 'vitest';
import { ALLERGY_CONFIRMATION_STALE_AFTER_DAYS, VITAL_STALE_AFTER_DAYS, isStale } from './vital-staleness';

const NOW = new Date('2026-09-23T12:00:00.000Z');
const DAY_MS = 86_400_000;

describe('isStale', () => {
  it('is not stale exactly at the threshold', () => {
    const date = new Date(NOW.getTime() - VITAL_STALE_AFTER_DAYS * DAY_MS);
    expect(isStale(date, VITAL_STALE_AFTER_DAYS, NOW)).toBe(false);
  });

  it('is stale one day past the threshold', () => {
    const date = new Date(NOW.getTime() - (VITAL_STALE_AFTER_DAYS + 1) * DAY_MS);
    expect(isStale(date, VITAL_STALE_AFTER_DAYS, NOW)).toBe(true);
  });

  it('is not stale for a fresh reading', () => {
    const date = new Date(NOW.getTime() - DAY_MS);
    expect(isStale(date, VITAL_STALE_AFTER_DAYS, NOW)).toBe(false);
  });

  it('supports a different threshold (allergy confirmation aging)', () => {
    const fresh = new Date(NOW.getTime() - 30 * DAY_MS);
    const aged = new Date(NOW.getTime() - (ALLERGY_CONFIRMATION_STALE_AFTER_DAYS + 1) * DAY_MS);
    expect(isStale(fresh, ALLERGY_CONFIRMATION_STALE_AFTER_DAYS, NOW)).toBe(false);
    expect(isStale(aged, ALLERGY_CONFIRMATION_STALE_AFTER_DAYS, NOW)).toBe(true);
  });
});
