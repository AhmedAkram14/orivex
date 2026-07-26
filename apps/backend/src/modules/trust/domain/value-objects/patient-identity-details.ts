import { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

import type { VerificationSubjectDetails } from './verification-subject-details.js';

// Patient identity verification (National ID + selfie) needs no data beyond
// what VerificationCase already holds for every subject (documentAssetIds) —
// this class exists so subjectType stays an explicit, named concept with its
// own value object (per architect decision), not a null/undefined case
// implicitly standing in for "nothing extra." Approving a Patient case
// raises no event: verification only unlocks the four gated actions
// (proposal §7a), it never changes Account.role the way Doctor approval
// does.
export class PatientIdentityDetails implements VerificationSubjectDetails {
  private constructor() {}

  static create(): PatientIdentityDetails {
    return new PatientIdentityDetails();
  }

  getSubjectType(): VerificationSubjectType {
    return VerificationSubjectType.Patient;
  }

  getApprovalEvent(): undefined {
    return undefined;
  }
}
