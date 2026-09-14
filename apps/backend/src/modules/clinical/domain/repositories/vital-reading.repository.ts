import type { VitalReading } from '../entities/vital-reading.entity.js';

export interface VitalReadingRepository {
  // Ordered by recordedAt ascending (oldest first) -- matches the frontend's
  // "readings ordered oldest to newest" contract directly, no need to
  // re-sort in the use case.
  findByPatientId(patientId: string): Promise<VitalReading[]>;
  // Real Clinical Vitals Demo pass: the demo seed's idempotency check --
  // "has this consultation session already had its vitals recorded?" --
  // needs a query scoped to the session, not the whole patient history.
  findByConsultationSessionId(consultationSessionId: string): Promise<VitalReading[]>;
  // K10 -- Wearables integration boundary. The idempotency check a device
  // ingestion use case performs before minting a new reading -- backed by
  // the DB's own (sourceProvider, externalObservationId) unique constraint,
  // which is the actual safety guarantee under concurrent re-delivery; this
  // lookup is only the fast, race-free-enough-for-a-friendly-response path.
  findBySourceAndExternalId(sourceProvider: string, externalObservationId: string): Promise<VitalReading | null>;
  save(vitalReading: VitalReading): Promise<void>;
}
