import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's TrustModule catalog entry ("Owned
// events: DoctorVerified, ..."). Published when a VerificationCase is decided
// Approved — downstream subscribers (DoctorModule unlocks Portfolio
// visibility, KnowledgeModule unlocks publishing rights, IdentityModule
// elevates role capabilities per docs/10-backend-architecture.md Section 12)
// are future work, not this sprint's concern.
// Onboarding Redesign (2026-07-21 proposal, Stage O.2): payload changed from
// doctorId to subjectAccountId -- the promotion handler only ever needed the
// Account to promote, and doctorId was an indirect route to it via a
// DoctorProfile lookup this event no longer requires.
export class DoctorVerifiedEvent extends DomainEvent {
  readonly eventName = 'doctor.verified';

  constructor(
    public readonly subjectAccountId: string,
    public readonly verificationCaseId: string,
  ) {
    super();
  }
}
