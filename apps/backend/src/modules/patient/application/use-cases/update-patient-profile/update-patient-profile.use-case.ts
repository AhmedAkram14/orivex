import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import type { UpdatePatientProfileCommand } from './update-patient-profile.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// patient.module.ts only.
export class UpdatePatientProfileUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: UpdatePatientProfileCommand): Promise<PatientProfile> {
    const profile = await this.patientProfileRepository.findById(command.patientProfileId);
    if (!profile) {
      throw new NotFoundError(`Patient profile "${command.patientProfileId}" not found.`);
    }

    profile.update({
      emergencyContacts: command.emergencyContacts,
      bloodType: command.bloodType,
      allergies: command.allergies,
      chronicDiseases: command.chronicDiseases,
      insuranceProviderId: command.insuranceProviderId,
    });

    await this.patientProfileRepository.save(profile);
    await this.eventDispatcher.dispatch(profile.releaseDomainEvents());

    return profile;
  }
}
