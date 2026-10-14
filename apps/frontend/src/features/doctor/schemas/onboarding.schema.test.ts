import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOnboardingProfileSchema } from './onboarding.schema';

const t = (key: string) => key;
const valid = {
  licenseNumber: 'LIC-9001',
  specialtyId: 'specialty-1',
  languages: ['English'],
  professionalRank: 'registrar' as const,
};

// 01:00 in Cairo on 13 Oct 2026 (still the 12th in UTC): "today" is Cairo's day.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-12T22:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function expiryError(licenseExpiryDate: string) {
  const result = createOnboardingProfileSchema(t).safeParse({ ...valid, licenseExpiryDate });
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === 'licenseExpiryDate')?.message;
}

describe('createOnboardingProfileSchema: license expiry date', () => {
  it('accepts today and any later date', () => {
    expect(expiryError('2026-10-13')).toBeUndefined();
    expect(expiryError('2031-01-01')).toBeUndefined();
  });

  it('rejects any past date, yesterday included', () => {
    expect(expiryError('2026-10-12')).toBe('licenseExpiryDatePast');
    expect(expiryError('2016-06-30')).toBe('licenseExpiryDatePast');
  });

  it('rejects a date that does not exist, and an empty one', () => {
    expect(expiryError('2027-02-31')).toBe('licenseExpiryDateInvalid');
    expect(expiryError('')).toBe('licenseExpiryDateRequired');
  });
});
