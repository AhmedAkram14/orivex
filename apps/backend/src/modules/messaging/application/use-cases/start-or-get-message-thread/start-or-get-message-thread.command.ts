export interface StartOrGetMessageThreadCommandProps {
  appointmentId: string;
  callerAccountId: string;
}

export class StartOrGetMessageThreadCommand {
  readonly appointmentId: string;
  readonly callerAccountId: string;

  constructor(props: StartOrGetMessageThreadCommandProps) {
    this.appointmentId = props.appointmentId;
    this.callerAccountId = props.callerAccountId;
  }
}
