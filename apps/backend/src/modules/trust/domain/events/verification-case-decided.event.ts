import { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { VerificationDecisionStatus } from '../entities/verification-case.entity.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

// Published on every VerificationCase decision (Approved/Rejected/
// MoreInfoNeeded) -- generic across subject types and outcomes: the
// submitter (doctor or patient) needs to know their application was
// decided regardless of what kind of applicant they are or which way it
// went. Raised alongside DoctorVerifiedEvent on the Approved+Doctor path
// (that one drives role promotion, subject-specific; this one drives the
// applicant's own notification, generic) -- two events from one decision
// is correct here, not duplication: each names a different consequence.
// NotificationModule subscribes to this by name only, mirroring
// VerificationCaseSubmittedEvent's own cross-module boundary.
export class VerificationCaseDecidedEvent extends DomainEvent {
  readonly eventName = 'verification.case.decided';

  constructor(
    public readonly verificationCaseId: string,
    public readonly subjectAccountId: string,
    public readonly subjectType: VerificationSubjectType,
    public readonly status: VerificationDecisionStatus,
    public readonly reason: string | undefined,
  ) {
    super();
  }
}
