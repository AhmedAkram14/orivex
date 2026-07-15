import { AuthenticationDomainError } from '../exceptions/authentication-domain.error.js';

// The only form of a refresh/email/reset token ever persisted — tokens are
// compared by hash only, never stored plaintext, same principle as passwords.
export class TokenHash {
  private constructor(private readonly value: string) {}

  static create(value: string): TokenHash {
    if (!value || value.trim().length === 0) {
      throw new AuthenticationDomainError('TokenHash must not be empty.');
    }
    return new TokenHash(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: TokenHash): boolean {
    return other instanceof TokenHash && other.value === this.value;
  }
}
