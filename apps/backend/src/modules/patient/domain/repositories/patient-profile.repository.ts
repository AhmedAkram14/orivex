import type { PatientProfile } from '../entities/patient-profile.entity.js';

export interface PatientProfileRepository {
  findById(id: string): Promise<PatientProfile | null>;
  findByAccountId(accountId: string): Promise<PatientProfile | null>;
  save(profile: PatientProfile): Promise<void>;
}
