import { DoctorDomainError } from './doctor-domain.error.js';

// Distinct subtype (mirrors Identity's AccountAlreadyExistsError
// precedent for a genuinely distinct, HTTP-status-relevant outcome) --
// thrown when the database's own unique constraint on
// DoctorProfile.accountId rejects a concurrent duplicate registration
// that raced past the application-layer check-then-act uniqueness guard
// in RegisterDoctorProfileUseCase. Without this, the raw Prisma P2002
// error would surface as an unmapped 500 instead of the same 409 a
// non-racing duplicate registration already gets.
export class DoctorProfileAlreadyExistsError extends DoctorDomainError {
  constructor(accountId: string) {
    super(`A doctor profile already exists for account "${accountId}".`);
  }
}
