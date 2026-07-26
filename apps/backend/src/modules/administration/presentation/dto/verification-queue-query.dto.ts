import { IsEnum, IsOptional } from 'class-validator';

import { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';
import { VerificationSubjectType } from '../../../trust/domain/enums/verification-subject-type.enum.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.2): optional subject-type
// filter on the admin verification queue -- omitted, returns both Doctor and
// Patient pending cases. Stage O.8: optional exact-status filter -- omitted,
// returns the default pending-review set; an explicit status (e.g. Approved)
// is how an admin finds a case to suspend.
export class VerificationQueueQueryDto {
  @IsOptional()
  @IsEnum(VerificationSubjectType)
  subjectType?: VerificationSubjectType;

  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}
