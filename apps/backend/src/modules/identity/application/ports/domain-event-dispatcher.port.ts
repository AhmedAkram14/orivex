import type { DomainEvent } from '../../domain/events/domain-event.js';

// Port only — no implementation this sprint. A future infrastructure adapter
// (in-process event emitter for V1, per docs/10-backend-architecture.md
// Section 14's evolution path; a real broker later without changing this
// contract) will bind to DOMAIN_EVENT_DISPATCHER (tokens.ts).
export interface DomainEventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>;
}
