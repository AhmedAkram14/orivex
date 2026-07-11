import type { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import type { GetDoctorProfileByIdQuery } from './get-doctor-profile-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors
// Identity's GetAccountByIdUseCase).
export class GetDoctorProfileByIdUseCase {
  constructor(private readonly doctorProfileRepository: DoctorProfileRepository) {}

  async execute(query: GetDoctorProfileByIdQuery): Promise<DoctorProfile | null> {
    return this.doctorProfileRepository.findById(query.doctorProfileId);
  }
}
