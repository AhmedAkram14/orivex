import { AuthenticationDomainError } from '../exceptions/authentication-domain.error.js';

// Wraps an already-hashed value (produced by the PasswordHasher port). No
// strength validation here — that already happened on the PlainPassword
// that produced this hash; this VO only guards against an empty/missing hash.
export class PasswordHash {
  private constructor(private readonly value: string) {}

  static create(value: string): PasswordHash {
    if (!value || value.trim().length === 0) {
      throw new AuthenticationDomainError('PasswordHash must not be empty.');
    }
    return new PasswordHash(value);
  }

  toString(): string {
    return this.value;
  }
}
