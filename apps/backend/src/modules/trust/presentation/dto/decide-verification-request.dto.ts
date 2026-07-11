import { IsIn, IsOptional, IsString } from 'class-validator';

import type { VerificationDecisionStatus } from '../../domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../domain/enums/verification-status.enum.js';

const DECISION_STATUSES = [
  VerificationStatus.Approved,
  VerificationStatus.Rejected,
  VerificationStatus.MoreInfoNeeded,
] as const;

// Matches docs/12-openapi.md's decideVerification request body exactly —
// only these three statuses are ever accepted from this endpoint (unlike the
// full 7-value VerificationStatus enum used elsewhere).
export class DecideVerificationRequestDto {
  @IsIn(DECISION_STATUSES)
  status!: VerificationDecisionStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
