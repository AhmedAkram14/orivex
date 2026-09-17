import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Dispute System Hardening Phase 0: a distinct event from
// DisputeResolvedEvent -- an admin found no issue here, which is a
// different real-world fact from finding in the raiser's favor, matching
// the AppointmentDeclinedEvent/AppointmentCancelledEvent "distinct event
// per distinct fact" precedent. Both parties are notified of the outcome.
export class DisputeDismissedEvent extends DomainEvent {
  readonly eventName = 'consultation.dispute.dismissed';

  constructor(public readonly disputeId: string) {
    super();
  }
}
