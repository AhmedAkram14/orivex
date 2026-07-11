export type AppointmentAction = 'reschedule' | 'cancel';

export interface RescheduleOrCancelAppointmentCommandProps {
  appointmentId: string;
  action: AppointmentAction;
  newAvailabilityWindowId?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RescheduleOrCancelAppointmentCommand {
  readonly appointmentId: string;
  readonly action: AppointmentAction;
  readonly newAvailabilityWindowId?: string;

  constructor(props: RescheduleOrCancelAppointmentCommandProps) {
    this.appointmentId = props.appointmentId;
    this.action = props.action;
    this.newAvailabilityWindowId = props.newAvailabilityWindowId;
  }
}
