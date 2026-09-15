import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Phase 2 (Doctor Patient Chart plan): a distinct event from
// AppointmentCancelledEvent so NotificationModule/audit consumers can tell
// "the doctor explicitly rejected this request before ever approving it"
// apart from every other cancellation reason -- while the Appointment's own
// `status` still lands on the same terminal AppointmentStatus.Cancelled
// value (no new enum member, zero impact on any other status-consuming
// code). `reason` is optional -- a doctor can decline without giving one.
export class AppointmentDeclinedEvent extends DomainEvent {
  readonly eventName = 'consultation.appointment.declined';

  constructor(
    public readonly appointmentId: string,
    public readonly reason?: string,
  ) {
    super();
  }
}
