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
  save(vitalReading: VitalReading): Promise<void>;
}
