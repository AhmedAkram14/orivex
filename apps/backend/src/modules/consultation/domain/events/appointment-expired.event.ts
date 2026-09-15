import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Phase 0 (stale-request terminal state): a distinct event from
// AppointmentCancelledEvent/AppointmentDeclinedEvent -- neither the doctor
// nor the patient made an affirmative decision here, the request simply
// went stale past its scheduledAt with nobody ever approving, declining, or
// paying for it. NotificationModule uses this to tell the patient their
// request expired unanswered, distinct wording from either a decline or a
// cancellation.
export class AppointmentExpiredEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.expired';

  constructor(public readonly appointmentId: string) {
    super();
  }
}
