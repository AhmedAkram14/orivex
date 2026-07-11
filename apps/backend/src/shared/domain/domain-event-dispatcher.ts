import type { DomainEvent } from './domain-event.js';

// Port only. A future infrastructure adapter (in-process event emitter for
// V1, per docs/10-backend-architecture.md Section 14's evolution path; a
// real broker later without changing this contract) binds to
// DOMAIN_EVENT_DISPATCHER (tokens.ts).
//
// subscribe() is the port-level mechanism for the event-driven module
// dependencies documented in docs/10-backend-architecture.md (e.g.
// ClinicalModule consuming AISuggestionGenerated/AISuggestionDecided rather
// than synchronously querying AIModule) -- a module's application layer can
// register a handler without depending on the concrete infrastructure
// adapter, keeping dependency inversion intact.
export interface DomainEventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: (event: DomainEvent) => void | Promise<void>): void;
}
