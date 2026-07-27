import { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

// Published whenever a doctor or patient submits a verification case for
// review -- previously nothing was raised on submission at all (only
// decide(Approved) raised DoctorVerifiedEvent), so Super Admins had no way
// to learn a new application existed short of polling the review queue.
// NotificationModule subscribes to this by name only, mirroring
// DoctorVerifiedEvent's own cross-module boundary.
export class VerificationCaseSubmittedEvent extends DomainEvent {
  readonly eventName = 'verification.case.submitted';

  constructor(
    public readonly verificationCaseId: string,
    public readonly subjectAccountId: string,
    public readonly subjectType: VerificationSubjectType,
  ) {
    super();
  }
}
