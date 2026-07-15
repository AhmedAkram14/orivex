import { AuthenticationDomainError } from './authentication-domain.error.js';

// Covers "not found", "wrong purpose", and "already used/revoked" — every
// case where a token is structurally present but not acceptable, distinct
// from TokenExpiredError's specifically time-based failure.
export class TokenInvalidError extends AuthenticationDomainError {
  constructor() {
    super('Token is invalid.');
  }
}
