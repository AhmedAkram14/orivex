import type { VerificationSubjectType } from '../../../domain/enums/verification-subject-type.enum.js';

export interface CheckIdentityVerificationStatusQuery {
  subjectType: VerificationSubjectType;
  subjectAccountId: string;
}
