export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthResult {
  score: PasswordStrengthScore;
  label: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
}

const LABELS: PasswordStrengthResult['label'][] = ['very-weak', 'weak', 'fair', 'strong', 'very-strong'];

/**
 * A pure, dependency-free strength heuristic (length + character-class
 * variety) — not a full entropy estimator (e.g. zxcvbn), which would be a
 * new-dependency decision on its own. Shared by the Password Strength
 * Meter component and the register/reset-password Zod schemas, so the
 * meter shown to a user and the rule that actually blocks submission never
 * disagree with each other.
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(score, 4) as PasswordStrengthScore;
  return { score: clamped, label: LABELS[clamped] };
}

/** The minimum bar a password must clear to be accepted at all — enforced by the Zod schemas below, not by this function itself. */
export const MIN_PASSWORD_LENGTH = 10;

export function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}
