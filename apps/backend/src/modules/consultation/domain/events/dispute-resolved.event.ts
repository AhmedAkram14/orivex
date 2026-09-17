import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Dispute System Hardening Phase 0: a distinct event from
// DisputeDismissedEvent -- an admin found in the raiser's favor here, which
// is a different real-world fact from finding no issue, matching the
// AppointmentDeclinedEvent/AppointmentCancelledEvent "distinct event per
// distinct fact" precedent. Both parties are notified of the outcome.
export class DisputeResolvedEvent extends DomainEvent {
  readonly eventName = 'consultation.dispute.resolved';

  constructor(public readonly disputeId: string) {
    super();
  }
}
