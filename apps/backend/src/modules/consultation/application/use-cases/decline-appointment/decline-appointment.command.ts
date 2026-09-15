export interface DeclineAppointmentCommandProps {
  appointmentId: string;
  reason?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style, e.g.
// ConfirmAppointmentCommand).
export class DeclineAppointmentCommand {
  readonly appointmentId: string;
  readonly reason?: string;

  constructor(props: DeclineAppointmentCommandProps) {
    this.appointmentId = props.appointmentId;
    this.reason = props.reason;
  }
}
