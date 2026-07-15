import { MIN_PASSWORD_LENGTH } from '../constants/authentication.constants.js';
import { WeakPasswordError } from '../exceptions/weak-password.error.js';

const HAS_LOWERCASE = /[a-z]/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_DIGIT = /[0-9]/;

// A raw, not-yet-hashed password — validated for strength here, at the
// domain boundary, then handed to the PasswordHasher port and immediately
// discarded. Never persisted, never logged, never wrapped around a hash.
export class PlainPassword {
  private constructor(private readonly value: string) {}

  static create(value: string): PlainPassword {
    if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError(`must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (!HAS_LOWERCASE.test(value) || !HAS_UPPERCASE.test(value) || !HAS_DIGIT.test(value)) {
      throw new WeakPasswordError('must contain an uppercase letter, a lowercase letter, and a digit.');
    }
    return new PlainPassword(value);
  }

  toString(): string {
    return this.value;
  }
}
