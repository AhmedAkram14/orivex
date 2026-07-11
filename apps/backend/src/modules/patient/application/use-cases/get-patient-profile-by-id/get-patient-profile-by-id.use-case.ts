import type { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import type { GetPatientProfileByIdQuery } from './get-patient-profile-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors
// Identity/Doctor's Get*ByIdUseCase pattern).
export class GetPatientProfileByIdUseCase {
  constructor(private readonly patientProfileRepository: PatientProfileRepository) {}

  async execute(query: GetPatientProfileByIdQuery): Promise<PatientProfile | null> {
    return this.patientProfileRepository.findById(query.patientProfileId);
  }
}
