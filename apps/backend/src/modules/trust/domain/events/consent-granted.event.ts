import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's TrustModule catalog entry
// ("Owned events: ..., ConsentGranted, ConsentRevoked").
export class ConsentGrantedEvent extends DomainEvent {
  readonly eventName = 'trust.consent.granted';

  constructor(
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly scopeCategoryCode: string,
  ) {
    super();
  }
}
