import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Per docs/10-backend-architecture.md's ClinicalModule catalog entry
// ("Events published: HealthGraphUpdated, JourneyUpdated, PrescriptionSigned, ...").
export class PrescriptionSignedEvent extends DomainEvent {
  readonly eventName = 'clinical.prescription.signed';

  constructor(public readonly prescriptionId: string) {
    super();
  }
}
