import { ClinicalDomainError } from './clinical-domain.error.js';

// K10 -- Distinct subtype (mirrors AccountAlreadyExistsError's precedent for
// a genuinely distinct, programmatically-relevant outcome). Thrown when the
// database's own unique constraint on (sourceProvider, externalObservationId)
// rejects a concurrent duplicate device-reading ingestion that raced past
// IngestWearableVitalReadingUseCase's application-layer check-then-act
// idempotency guard. The use case catches this and re-queries for the
// winning row rather than surfacing an error -- concurrent duplicate
// ingestion is a normal, expected outcome of at-least-once device delivery,
// not a failure.
export class DuplicateWearableVitalReadingError extends ClinicalDomainError {
  constructor(
    public readonly sourceProvider: string,
    public readonly externalObservationId: string,
  ) {
    super(
      `A vital reading from source "${sourceProvider}" with external observation id "${externalObservationId}" already exists.`,
    );
  }
}
