import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's PatientModule catalog entry
// ("Owned events: PatientProfileUpdated"). Raised on both initial creation
// and subsequent edits — the docs list only this one event for the whole
// entity, no separate "Created" event (mirrors DoctorModule's
// DoctorProfileUpdatedEvent pattern).
export class PatientProfileUpdatedEvent extends DomainEvent {
  readonly eventName = 'patient.profile.updated';

  constructor(public readonly patientProfileId: string) {
    super();
  }
}
