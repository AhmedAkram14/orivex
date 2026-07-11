import type { VerificationDecisionStatus } from '../../../domain/entities/verification-case.entity.js';

export interface DecideVerificationCommandProps {
  verificationCaseId: string;
  status: VerificationDecisionStatus;
  reason?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor's established Command style).
export class DecideVerificationCommand {
  readonly verificationCaseId: string;
  readonly status: VerificationDecisionStatus;
  readonly reason?: string;

  constructor(props: DecideVerificationCommandProps) {
    this.verificationCaseId = props.verificationCaseId;
    this.status = props.status;
    this.reason = props.reason;
  }
}
