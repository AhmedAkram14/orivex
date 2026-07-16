import type { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import type { GetPatientProfileByAccountIdQuery } from './get-patient-profile-by-account-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors
// GetPatientProfileByIdUseCase's own pattern). The controller layer decides
// what "no profile yet" means for a given route (e.g. lazily creating one
// for a "my profile" endpoint vs. a 404 for someone else's).
export class GetPatientProfileByAccountIdUseCase {
  constructor(private readonly patientProfileRepository: PatientProfileRepository) {}

  async execute(query: GetPatientProfileByAccountIdQuery): Promise<PatientProfile | null> {
    return this.patientProfileRepository.findByAccountId(query.accountId);
  }
}
