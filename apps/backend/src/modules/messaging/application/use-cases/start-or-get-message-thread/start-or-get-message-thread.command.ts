export interface StartOrGetMessageThreadCommandProps {
  counterpartyProfileId: string;
  callerAccountId: string;
}

export class StartOrGetMessageThreadCommand {
  readonly counterpartyProfileId: string;
  readonly callerAccountId: string;

  constructor(props: StartOrGetMessageThreadCommandProps) {
    this.counterpartyProfileId = props.counterpartyProfileId;
    this.callerAccountId = props.callerAccountId;
  }
}
