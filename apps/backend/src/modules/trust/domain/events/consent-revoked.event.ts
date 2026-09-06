import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's TrustModule catalog entry
// ("Owned events: ..., ConsentGranted, ConsentRevoked"). Per Section 9's
// event catalog: ClinicalModule's read path always re-checks TrustModule
// synchronously regardless of cached event state -- this event exists for
// other consumers (e.g. a future notification to the doctor), never as the
// sole mechanism a read path relies on for access-control correctness.
export class ConsentRevokedEvent extends DomainEvent {
  readonly eventName = 'trust.consent.revoked';

  constructor(
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly scopeCategoryCode: string,
  ) {
    super();
  }
}
