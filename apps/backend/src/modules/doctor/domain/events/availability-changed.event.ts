import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's DoctorModule catalog entry ("Owned
// events: DoctorProfileUpdated, AvailabilityChanged"). Raised on every
// AvailabilityWindow state transition (define, hold, release, confirm).
export class AvailabilityChangedEvent extends DomainEvent {
  readonly eventName = 'doctor.availability.changed';

  constructor(public readonly availabilityWindowId: string) {
    super();
  }
}
