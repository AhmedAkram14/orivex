import type { ConsentRecord } from '../entities/consent-record.entity.js';

// Append-only: save() only ever inserts a new row (matches ConsentRecord's
// own "never update in place" nature) -- no update/delete method exists.
export interface ConsentRecordRepository {
  // The current state for one (patientId, doctorId, scopeCategoryId) triple
  // -- the row with the highest versionNumber, or null if no row exists yet
  // (meaning: never explicitly changed, so GRANTED by default -- the caller
  // decides what "no row" means, this repository just reports the fact).
  findCurrent(patientId: string, doctorId: string, scopeCategoryId: string): Promise<ConsentRecord | null>;
  // Every doctor a patient has ever recorded a REVOKED row for, current
  // state only -- powers the patient-facing "who did I revoke" list without
  // requiring the caller to already know which doctors to check.
  findAllRevokedForPatient(patientId: string, scopeCategoryId: string): Promise<ConsentRecord[]>;
  // The patient's full consent history -- every version, every doctor,
  // most recent first. Matches docs/12-openapi.md's GET
  // /patients/{id}/consents (listConsents) exactly.
  findAllForPatient(patientId: string): Promise<ConsentRecord[]>;
  save(record: ConsentRecord): Promise<void>;
}
