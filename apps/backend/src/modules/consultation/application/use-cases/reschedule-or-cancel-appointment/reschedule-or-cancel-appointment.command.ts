export type AppointmentAction = 'reschedule' | 'cancel';
export type CancelledByRole = 'doctor' | 'patient';

export interface RescheduleOrCancelAppointmentCommandProps {
  appointmentId: string;
  action: AppointmentAction;
  newAvailabilityWindowId?: string;
  // Required only for 'cancel' -- carried onto AppointmentCancelledEvent so
  // PaymentModule's own handler can apply the unconditional cancellation
  // auto-refund rule (and NotificationModule can vary its message) without
  // ConsultationModule ever depending on Payment.
  cancelledByRole?: CancelledByRole;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RescheduleOrCancelAppointmentCommand {
  readonly appointmentId: string;
  readonly action: AppointmentAction;
  readonly newAvailabilityWindowId?: string;
  readonly cancelledByRole?: CancelledByRole;

  constructor(props: RescheduleOrCancelAppointmentCommandProps) {
    this.appointmentId = props.appointmentId;
    this.action = props.action;
    this.newAvailabilityWindowId = props.newAvailabilityWindowId;
    this.cancelledByRole = props.cancelledByRole;
  }
}
