import type { ConsentRecord } from '../../../domain/entities/consent-record.entity.js';
import type { ConsentRecordRepository } from '../../../domain/repositories/consent-record.repository.js';

export interface ListConsentHistoryForPatientQuery {
  patientId: string;
}

// Matches docs/12-openapi.md's GET /patients/{id}/consents (listConsents)
// exactly: the patient's full consent history, every version.
export class ListConsentHistoryForPatientUseCase {
  constructor(private readonly consentRecordRepository: ConsentRecordRepository) {}

  async execute(query: ListConsentHistoryForPatientQuery): Promise<ConsentRecord[]> {
    return this.consentRecordRepository.findAllForPatient(query.patientId);
  }
}
