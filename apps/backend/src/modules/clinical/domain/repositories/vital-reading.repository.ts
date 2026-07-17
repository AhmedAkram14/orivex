import type { VitalReading } from '../entities/vital-reading.entity.js';

export interface VitalReadingRepository {
  // Ordered by recordedAt ascending (oldest first) -- matches the frontend's
  // "readings ordered oldest to newest" contract directly, no need to
  // re-sort in the use case.
  findByPatientId(patientId: string): Promise<VitalReading[]>;
  save(vitalReading: VitalReading): Promise<void>;
}
