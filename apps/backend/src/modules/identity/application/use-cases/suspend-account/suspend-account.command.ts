export interface SuspendAccountCommandProps {
  accountId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (all fields readonly, no mutators).
export class SuspendAccountCommand {
  readonly accountId: string;

  constructor(props: SuspendAccountCommandProps) {
    this.accountId = props.accountId;
  }
}
