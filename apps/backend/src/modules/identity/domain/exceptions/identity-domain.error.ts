// Base type for every exception raised within the Identity bounded context.
// Callers can catch this one type to handle any Identity-domain failure
// generically, or catch a specific subclass (see this folder) to handle one
// precisely. Concrete on its own (not abstract) so invariants without a
// dedicated subclass yet can still throw a real, catchable domain type
// instead of a plain Error.
export class IdentityDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
