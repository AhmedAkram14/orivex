import type { VerificationDecisionStatus } from '../../../../trust/domain/entities/verification-case.entity.js';

export interface ReviewVerificationCaseCommandProps {
  verificationCaseId: string;
  status: VerificationDecisionStatus;
  reason?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches Identity/Doctor/Trust's established Command style).
export class ReviewVerificationCaseCommand {
  readonly verificationCaseId: string;
  readonly status: VerificationDecisionStatus;
  readonly reason?: string;

  constructor(props: ReviewVerificationCaseCommandProps) {
    this.verificationCaseId = props.verificationCaseId;
    this.status = props.status;
    this.reason = props.reason;
  }
}
