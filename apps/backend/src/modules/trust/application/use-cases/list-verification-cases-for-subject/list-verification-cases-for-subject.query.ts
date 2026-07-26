import type { VerificationSubjectType } from '../../../domain/enums/verification-subject-type.enum.js';

export interface ListVerificationCasesForSubjectQuery {
  subjectType: VerificationSubjectType;
  subjectAccountId: string;
}
