import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's TrustModule catalog entry ("Owned
// events: DoctorVerified, ..."). Published when a VerificationCase is decided
// Approved — downstream subscribers (DoctorModule unlocks Portfolio
// visibility, KnowledgeModule unlocks publishing rights, IdentityModule
// elevates role capabilities per docs/10-backend-architecture.md Section 12)
// are future work, not this sprint's concern.
export class DoctorVerifiedEvent extends DomainEvent {
  readonly eventName = 'doctor.verified';

  constructor(
    public readonly doctorId: string,
    public readonly verificationCaseId: string,
  ) {
    super();
  }
}
