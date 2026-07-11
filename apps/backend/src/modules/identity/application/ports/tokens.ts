// NestJS DI injection tokens for the ports this module depends on. Kept in
// the application layer (not domain) since dependency injection is a
// framework concern — the domain layer's AccountRepository interface has no
// knowledge that a token exists for it.
export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
export const DOMAIN_EVENT_DISPATCHER = Symbol('DomainEventDispatcher');
