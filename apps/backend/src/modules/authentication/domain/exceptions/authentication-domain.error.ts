// Base type for every exception raised within the Authentication bounded
// context. Callers can catch this one type to handle any Authentication-
// domain failure generically, or catch a specific subclass (see this folder)
// to handle one precisely. Mirrors Identity's IdentityDomainError.
export class AuthenticationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
