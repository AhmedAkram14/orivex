// Base type for every exception raised within the Reference bounded context
// — mirrors AdministrationDomainError/IdentityDomainError's precedent
// exactly.
export class ReferenceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
