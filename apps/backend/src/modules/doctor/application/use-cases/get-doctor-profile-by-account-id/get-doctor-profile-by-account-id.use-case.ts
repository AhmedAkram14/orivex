import type { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import type { GetDoctorProfileByAccountIdQuery } from './get-doctor-profile-by-account-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors
// GetDoctorProfileByIdUseCase's own pattern). The controller layer decides
// what "no profile yet" means for a given route.
export class GetDoctorProfileByAccountIdUseCase {
  constructor(private readonly doctorProfileRepository: DoctorProfileRepository) {}

  async execute(query: GetDoctorProfileByAccountIdQuery): Promise<DoctorProfile | null> {
    return this.doctorProfileRepository.findByAccountId(query.accountId);
  }
}
