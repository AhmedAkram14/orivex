import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Raised when a doctor approves a Requested appointment (§3 of the
// doctor-approval-workflow fix: every booking, Free or Paid, now waits for
// this before it's Confirmed and enters the queue) -- previously confirm()
// raised nothing at all, so nothing could notify the patient their
// appointment was approved. Not documented in docs/10-backend-architecture.md's
// original ConsultationModule catalog entry (which predates the approval
// workflow); this is additive, not a contract break.
export class AppointmentConfirmedEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.confirmed';

  constructor(public readonly appointmentId: string) {
    super();
  }
}
