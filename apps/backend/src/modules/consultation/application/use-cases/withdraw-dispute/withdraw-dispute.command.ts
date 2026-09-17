export interface WithdrawDisputeProps {
  disputeId: string;
  callerAccountId: string;
}

export class WithdrawDisputeCommand {
  readonly disputeId: string;
  readonly callerAccountId: string;

  constructor(props: WithdrawDisputeProps) {
    this.disputeId = props.disputeId;
    this.callerAccountId = props.callerAccountId;
  }
}
