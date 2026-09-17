import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Dispute System Hardening Phase 0: the raiser retracted their own dispute
// while it was still Open -- neither an admin resolution nor a dismissal.
// NotificationModule uses this to update the counterparty's view without
// requiring them to poll.
export class DisputeWithdrawnEvent extends DomainEvent {
  readonly eventName = 'consultation.dispute.withdrawn';

  constructor(public readonly disputeId: string) {
    super();
  }
}
