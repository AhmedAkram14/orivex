import { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

// Published when a previously-Approved VerificationCase is suspended
// (license lapse, a compliance finding) -- mirrors VerificationCaseDecidedEvent's
// shape exactly (verificationCaseId, subjectAccountId, subjectType, reason),
// generic across subject types. Suspension is a distinct, later transition
// from decide()'s own initial-review outcomes (see VerificationCase.suspend()'s
// own comment) -- this is a separate event, not a reuse of
// VerificationCaseDecidedEvent, because "suspended" is not one of that
// event's VerificationDecisionStatus values and never should be (ADR-007:
// suspension never auto-demotes role, a distinct concern from the initial
// decision). NotificationModule subscribes to this by name only, mirroring
// VerificationCaseDecidedEvent's own cross-module boundary.
export class VerificationCaseSuspendedEvent extends DomainEvent {
  readonly eventName = 'verification.case.suspended';

  constructor(
    public readonly verificationCaseId: string,
    public readonly subjectAccountId: string,
    public readonly subjectType: VerificationSubjectType,
    public readonly reason: string,
  ) {
    super();
  }
}
