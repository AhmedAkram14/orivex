import { IdentityDomainError } from './identity-domain.error.js';

// Distinct subtype (mirrors AccountClosedError's precedent for a
// genuinely distinct, HTTP-status-relevant outcome) -- thrown when the
// database's own unique constraint on Account.email rejects a concurrent
// duplicate registration that raced past the application-layer
// check-then-act uniqueness guard in RegisterAccountUseCase. Without this,
// the raw Prisma P2002 error would surface as an unmapped 500 instead of
// the same 409 a non-racing duplicate registration already gets.
export class AccountAlreadyExistsError extends IdentityDomainError {
  constructor(email: string) {
    super(`An account with email "${email}" already exists.`);
  }
}
