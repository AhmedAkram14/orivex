// Shared DI token: one dispatcher instance app-wide, so events from any
// module flow through the same in-process bus. Per-aggregate repository
// tokens stay owned by each module (different interfaces per aggregate);
// this one is genuinely generic, hence shared.
export const DOMAIN_EVENT_DISPATCHER = Symbol('DomainEventDispatcher');
