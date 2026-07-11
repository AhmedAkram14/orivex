// NestJS DI injection token for this module's own repository port. The
// DomainEventDispatcher token is generic/shared (shared/domain/tokens.js),
// not redeclared here.
export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
