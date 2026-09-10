import type { HealthPassportEntry } from '../entities/health-passport-entry.entity.js';

export interface HealthPassportEntryRepository {
  findById(id: string): Promise<HealthPassportEntry | null>;
  findByPatientId(patientId: string): Promise<HealthPassportEntry[]>;
  save(entry: HealthPassportEntry): Promise<void>;
  delete(id: string): Promise<void>;
}
