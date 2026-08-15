export type AppointmentAction = 'reschedule' | 'cancel';
export type InitiatedByRole = 'doctor' | 'patient';

export interface RescheduleOrCancelAppointmentCommandProps {
  appointmentId: string;
  action: AppointmentAction;
  newAvailabilityWindowId?: string;
  // Who called this endpoint -- either the owning doctor or the owning
  // patient may reschedule or cancel. Carried onto AppointmentCancelledEvent/
  // AppointmentRescheduledEvent so PaymentModule's own handler can apply the
  // unconditional cancellation auto-refund rule, and NotificationModule can
  // vary its message and notify the OTHER party without self-notifying the
  // initiator, without ConsultationModule ever depending on either module.
  initiatedByRole?: InitiatedByRole;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RescheduleOrCancelAppointmentCommand {
  readonly appointmentId: string;
  readonly action: AppointmentAction;
  readonly newAvailabilityWindowId?: string;
  readonly initiatedByRole?: InitiatedByRole;

  constructor(props: RescheduleOrCancelAppointmentCommandProps) {
    this.appointmentId = props.appointmentId;
    this.action = props.action;
    this.newAvailabilityWindowId = props.newAvailabilityWindowId;
    this.initiatedByRole = props.initiatedByRole;
  }
}
