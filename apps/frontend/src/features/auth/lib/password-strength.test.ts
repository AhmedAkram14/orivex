import { describe, expect, it } from 'vitest';
import { getPasswordStrength, isPasswordStrongEnough } from './password-strength';

describe('getPasswordStrength', () => {
  it('scores an empty or trivial password as very weak', () => {
    expect(getPasswordStrength('').score).toBe(0);
    expect(getPasswordStrength('abc').score).toBe(0);
  });

  it('scores a long, mixed-case, numeric, symbol password as very strong', () => {
    const { score, label } = getPasswordStrength('Str0ng!Passw0rd');
    expect(score).toBe(4);
    expect(label).toBe('very-strong');
  });

  it('increases monotonically as character-class variety increases at a fixed length', () => {
    const lower = getPasswordStrength('aaaaaaaaaaaa').score;
    const lowerUpper = getPasswordStrength('aaaaaaaaaaaA').score;
    const lowerUpperDigit = getPasswordStrength('aaaaaaaaaaA1').score;
    expect(lowerUpper).toBeGreaterThanOrEqual(lower);
    expect(lowerUpperDigit).toBeGreaterThanOrEqual(lowerUpper);
  });
});

describe('isPasswordStrongEnough', () => {
  it('rejects passwords shorter than the minimum length', () => {
    expect(isPasswordStrongEnough('Abc123')).toBe(false);
  });

  it('rejects passwords missing a required character class', () => {
    expect(isPasswordStrongEnough('alllowercase1234')).toBe(false);
    expect(isPasswordStrongEnough('ALLUPPERCASE1234')).toBe(false);
    expect(isPasswordStrongEnough('NoDigitsHereAtAll')).toBe(false);
  });

  it('accepts a password meeting length and character-class requirements', () => {
    expect(isPasswordStrongEnough('GoodPassword123')).toBe(true);
  });
});
