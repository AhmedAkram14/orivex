import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { DoctorFollow } from '../../../domain/entities/doctor-follow.entity.js';
import type { DoctorFollowRepository } from '../../../domain/repositories/doctor-follow.repository.js';

export interface ListFollowedDoctorsQuery {
  callerAccountId: string;
}

export class ListFollowedDoctorsUseCase {
  constructor(
    private readonly doctorFollowRepository: DoctorFollowRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListFollowedDoctorsQuery): Promise<DoctorFollow[]> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('No patient profile exists for this account.');
    }
    return this.doctorFollowRepository.listByPatientId(patientProfile.getId());
  }
}
