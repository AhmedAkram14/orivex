import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { DoctorFollow } from '../../../domain/entities/doctor-follow.entity.js';
import type { DoctorFollowRepository } from '../../../domain/repositories/doctor-follow.repository.js';

import type { FollowDoctorCommand } from './follow-doctor.command.js';

// I13 -- Knowledge Center: a content-subscription signal only (see
// DoctorFollow's own doc comment) -- idempotent, returns the existing
// follow if one already exists rather than erroring, same "reuse if it
// already exists" idiom StartOrGetMessageThreadUseCase established for I7.
export class FollowDoctorUseCase {
  constructor(
    private readonly doctorFollowRepository: DoctorFollowRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: FollowDoctorCommand): Promise<DoctorFollow> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('No patient profile exists for this account.');
    }
    const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.doctorId });
    if (!doctorProfile) {
      throw new NotFoundError(`Doctor profile "${command.doctorId}" not found.`);
    }

    const existing = await this.doctorFollowRepository.findByPatientAndDoctor(patientProfile.getId(), command.doctorId);
    if (existing) {
      return existing;
    }

    const follow = DoctorFollow.follow({ patientId: patientProfile.getId(), doctorId: command.doctorId });
    await this.doctorFollowRepository.save(follow);
    return follow;
  }
}
