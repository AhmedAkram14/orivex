import { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { VerificationStatus } from '../enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

// Published when a VerificationCase is decided Rejected or MoreInfoNeeded --
// deliberately NOT Approved, which already has its own polymorphic
// DoctorVerifiedEvent path (role promotion, subject-specific). This one is
// generic across subject types: the submitter (doctor or patient) needs to
// know their application needs attention regardless of what kind of
// applicant they are. NotificationModule subscribes to this by name only,
// mirroring VerificationCaseSubmittedEvent's own cross-module boundary.
export class VerificationCaseDecidedEvent extends DomainEvent {
  readonly eventName = 'verification.case.decided';

  constructor(
    public readonly verificationCaseId: string,
    public readonly subjectAccountId: string,
    public readonly subjectType: VerificationSubjectType,
    public readonly status: VerificationStatus.Rejected | VerificationStatus.MoreInfoNeeded,
    public readonly reason: string | undefined,
  ) {
    super();
  }
}
