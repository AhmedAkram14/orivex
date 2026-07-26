export interface SuspendVerificationCaseCommandProps {
  verificationCaseId: string;
  reason: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches DecideVerificationCommand's own established shape).
export class SuspendVerificationCaseCommand {
  readonly verificationCaseId: string;
  readonly reason: string;

  constructor(props: SuspendVerificationCaseCommandProps) {
    this.verificationCaseId = props.verificationCaseId;
    this.reason = props.reason;
  }
}
