import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Dispute System Hardening Phase 0: fired when a party raises a new
// Dispute against an Appointment. NotificationModule uses this to tell the
// counterparty (whoever on the appointment is NOT the raiser) that a
// dispute now exists -- previously a dispute was visible only to whoever
// raised it, with no way for the counterparty to ever find out.
export class DisputeRaisedEvent extends DomainEvent {
  readonly eventName = 'consultation.dispute.raised';

  constructor(public readonly disputeId: string) {
    super();
  }
}
