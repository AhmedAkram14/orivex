export interface RaiseDisputeProps {
  appointmentId: string;
  callerAccountId: string;
  reason: string;
}

export class RaiseDisputeCommand {
  readonly appointmentId: string;
  readonly callerAccountId: string;
  readonly reason: string;

  constructor(props: RaiseDisputeProps) {
    this.appointmentId = props.appointmentId;
    this.callerAccountId = props.callerAccountId;
    this.reason = props.reason;
  }
}
