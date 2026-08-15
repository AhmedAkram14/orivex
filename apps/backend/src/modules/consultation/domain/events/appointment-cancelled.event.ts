import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Consultation Pricing Lifecycle Completion: carries who cancelled --
// PaymentModule's own event handler uses this to apply the one
// unambiguous automatic-refund rule the product decision authorized:
// cancellation of a paid, already-charged appointment = always full
// refund, unconditionally, regardless of whether the doctor or the
// patient cancelled (no time-based cutoff, no partial refund). cancelledBy
// is still carried on the event because other consumers (e.g.
// NotificationModule) vary their behavior by who cancelled, even though
// the refund rule itself no longer does.
export class AppointmentCancelledEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.cancelled';

  constructor(
    public readonly appointmentId: string,
    public readonly cancelledBy: 'doctor' | 'patient',
  ) {
    super();
  }
}
