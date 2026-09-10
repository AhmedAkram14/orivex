import type { HealthPassportEntry } from '../../../domain/entities/health-passport-entry.entity.js';
import type { HealthPassportEntryRepository } from '../../../domain/repositories/health-passport-entry.repository.js';

import type { ListHealthPassportEntriesForPatientQuery } from './list-health-passport-entries-for-patient.query.js';

// Pure read — mirrors the established List*UseCase pattern.
export class ListHealthPassportEntriesForPatientUseCase {
  constructor(private readonly healthPassportEntryRepository: HealthPassportEntryRepository) {}

  async execute(query: ListHealthPassportEntriesForPatientQuery): Promise<HealthPassportEntry[]> {
    return this.healthPassportEntryRepository.findByPatientId(query.patientId);
  }
}
