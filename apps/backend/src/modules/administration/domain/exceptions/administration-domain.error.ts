// Base type for every exception raised within the Administration bounded
// context — mirrors IdentityDomainError's precedent exactly.
export class AdministrationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
