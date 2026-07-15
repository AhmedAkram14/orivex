import { AuthenticationDomainError } from '../exceptions/authentication-domain.error.js';

const MIN_TOKEN_LENGTH = 16;

// A raw, not-yet-hashed opaque token (used for both refresh tokens and
// email/reset tokens before hashing) — produced by the TokenGenerator port,
// returned to the caller once, then only its hash is ever persisted.
export class PlainToken {
  private constructor(private readonly value: string) {}

  static create(value: string): PlainToken {
    if (!value || value.trim().length < MIN_TOKEN_LENGTH) {
      throw new AuthenticationDomainError('PlainToken must be a non-trivial opaque string.');
    }
    return new PlainToken(value);
  }

  toString(): string {
    return this.value;
  }
}
