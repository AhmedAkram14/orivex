import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { DoctorProfile } from '../../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../domain/repositories/doctor-profile.repository.js';
import { assertLicenseNotExpired } from '../../../domain/services/doctor-eligibility.js';
import { calendarDay } from '../../../../../shared/date/calendar-date.js';

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

    // A new license expiry date must not be in the past. The date already on file is accepted as it is, so a
    // doctor whose license has since lapsed can still save the rest of their profile.
    const currentExpiry = profile.getLicenseExpiryDate();
    if (command.licenseExpiryDate && (!currentExpiry || calendarDay(currentExpiry) !== calendarDay(command.licenseExpiryDate))) {
      assertLicenseNotExpired(command.licenseExpiryDate);
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
      maxFreeSlotsPerDay: command.maxFreeSlotsPerDay,
      bufferMinutesOverride: command.bufferMinutesOverride,
      autoApproveFreeBookings: command.autoApproveFreeBookings,
    });

    await this.doctorProfileRepository.save(profile);
    await this.eventDispatcher.dispatch(profile.releaseDomainEvents());

    return profile;
  }
}
