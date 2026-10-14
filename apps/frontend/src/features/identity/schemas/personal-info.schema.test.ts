import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersonalInfoSchema } from './personal-info.schema';

const t = (key: string) => key;
const valid = { gender: 'male' as const, nationalityId: 'country-eg', address: '12 Tahrir Street' };

// Noon in Cairo on 13 Oct 2026.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function dateOfBirthError(dateOfBirth: string, ageRange?: { min: number; max: number }) {
  const result = createPersonalInfoSchema(t, { ageRange }).safeParse({ ...valid, dateOfBirth });
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === 'dateOfBirth')?.message;
}

describe('createPersonalInfoSchema: date of birth', () => {
  it('accepts any plausible past date when no age range is given', () => {
    expect(dateOfBirthError('2020-05-01')).toBeUndefined();
    expect(dateOfBirthError('1910-01-01')).toBeUndefined();
  });

  it('rejects a future date, and one more than 120 years ago', () => {
    expect(dateOfBirthError('2026-10-14')).toBe('dateOfBirthFuture');
    expect(dateOfBirthError('1906-10-13')).toBeUndefined(); // 120 today
    expect(dateOfBirthError('1905-10-12')).toBe('dateOfBirthTooOld'); // 121
  });

  it("with the doctor application's range, accepts 22 to 90 inclusive", () => {
    const range = { min: 22, max: 90 };
    expect(dateOfBirthError('2004-10-13', range)).toBeUndefined(); // 22 today
    expect(dateOfBirthError('1935-10-14', range)).toBeUndefined(); // 90, 91 tomorrow
    expect(dateOfBirthError('2004-10-14', range)).toBe('dateOfBirthAgeRange'); // 21
    expect(dateOfBirthError('1935-10-13', range)).toBe('dateOfBirthAgeRange'); // 91 today
    expect(dateOfBirthError('2020-01-01', range)).toBe('dateOfBirthAgeRange');
  });
});
