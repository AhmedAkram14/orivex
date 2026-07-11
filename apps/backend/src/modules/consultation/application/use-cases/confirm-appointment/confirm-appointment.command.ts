export interface ConfirmAppointmentCommandProps {
  appointmentId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class ConfirmAppointmentCommand {
  readonly appointmentId: string;

  constructor(props: ConfirmAppointmentCommandProps) {
    this.appointmentId = props.appointmentId;
  }
}
