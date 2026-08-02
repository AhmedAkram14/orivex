import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';

import type { UpdateDoctorProfileCommand } from './update-doctor-profile.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// doctor.module.ts only. Domain exceptions from DoctorProfile.update()
// propagate untouched (translation belongs to the presentation layer).
export class UpdateDoctorProfileUseCase {
  constructor(
    private readonly doctorProfileRepository: DoctorProfileRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: UpdateDoctorProfileCommand): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepository.findById(command.doctorProfileId);
    if (!profile) {
      throw new NotFoundError(`Doctor profile "${command.doctorProfileId}" not found.`);
    }

    profile.update({
      biography: command.biography,
      yearsOfExperience: command.yearsOfExperience,
      languages: command.languages,
      insuranceProviders: command.insuranceProviders,
      consultationFeeAmount: command.consultationFeeAmount,
      hospitalId: command.hospitalId,
      publications: command.publications,
      awards: command.awards,
      workExperience: command.workExperience,
      specialtyId: command.specialtyId,
      professionalRank: command.professionalRank,
      licenseExpiryDate: command.licenseExpiryDate,
      departmentId: command.departmentId,
    });

    await this.doctorProfileRepository.save(profile);
    await this.eventDispatcher.dispatch(profile.releaseDomainEvents());

    return profile;
  }
}
