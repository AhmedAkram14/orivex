import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's DoctorModule catalog entry
// ("Owned events: DoctorProfileUpdated, ..."). Raised on both initial
// registration and subsequent edits — the docs list only this one event for
// the whole entity, no separate "Created" event.
export class DoctorProfileUpdatedEvent extends DomainEvent {
  readonly eventName = 'doctor.profile.updated';

  constructor(public readonly doctorProfileId: string) {
    super();
  }
}
