import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ConsultationModule catalog entry
// ("Owned events: AppointmentBooked, ..."). Raised once, at booking time --
// no separate events are documented for confirm/cancel/reschedule/complete.
export class AppointmentBookedEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.booked';

  constructor(public readonly appointmentId: string) {
    super();
  }
}
