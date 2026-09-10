import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { DoctorFollowRepository } from '../../../domain/repositories/doctor-follow.repository.js';

import type { UnfollowDoctorCommand } from './unfollow-doctor.command.js';

export class UnfollowDoctorUseCase {
  constructor(
    private readonly doctorFollowRepository: DoctorFollowRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(command: UnfollowDoctorCommand): Promise<void> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('No patient profile exists for this account.');
    }

    const existing = await this.doctorFollowRepository.findByPatientAndDoctor(patientProfile.getId(), command.doctorId);
    if (!existing) {
      // Idempotent -- unfollowing something you don't follow is a no-op, not an error.
      return;
    }
    await this.doctorFollowRepository.delete(existing.getId());
  }
}
