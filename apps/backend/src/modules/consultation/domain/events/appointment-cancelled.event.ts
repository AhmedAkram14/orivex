import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Consultation Pricing Lifecycle Completion: carries who cancelled --
// PaymentModule's own event handler uses this to apply the one
// unambiguous automatic-refund rule the PRD documents (doctor-initiated
// cancellation of a paid, already-charged appointment = always full
// refund; docs/01-prd.md). Patient-initiated cancellation refund policy
// (a time-based cutoff/partial-refund rule) is explicitly NOT implemented
// -- the PRD never specifies the cutoff or the partial percentage, so this
// event intentionally carries enough information for that rule to be
// added later without another event/schema change, without inventing the
// rule now.
export class AppointmentCancelledEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.cancelled';

  constructor(
    public readonly appointmentId: string,
    public readonly cancelledBy: 'doctor' | 'patient',
  ) {
    super();
  }
}
