import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

// Onboarding Redesign (2026-07-21 proposal, Stage O.2): the aggregate's one
// extension point. Adding a third verification subject in the future means
// adding a new class implementing this interface plus a new
// VerificationCase factory method -- VerificationCase.decide()/suspend()
// never change, since they dispatch through this interface polymorphically
// rather than branching on subjectType themselves (Open/Closed Principle).
export interface VerificationSubjectDetails {
  getSubjectType(): VerificationSubjectType;
  // Returns the event to raise when a case for this subject type is
  // Approved, or undefined if approving this subject type raises nothing
  // (an explicit, named decision per subject type -- never an implicit
  // "no event" fallen into by omission).
  getApprovalEvent(subjectAccountId: string, verificationCaseId: string): DomainEvent | undefined;
}
