import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { PatientProfile } from '../../../domain/entities/patient-profile.entity.js';
import type { PatientProfileRepository } from '../../../domain/repositories/patient-profile.repository.js';

import type { ConfirmNoKnownAllergiesCommand } from './confirm-no-known-allergies.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// patient.module.ts only.
//
// Doctor Patient Chart plan, 4.3: a new, deliberate doctor-write-authority
// boundary into PatientModule (decision 2). Authorization (the caller is a
// treating doctor with active consent) is the presentation layer's job --
// this use case only knows "confirm no known allergies for this patient
// profile," mirroring UpdatePatientProfileUseCase's own shape exactly. The
// "never overwrite a real positive allergy record" rule lives on the
// PatientProfile aggregate itself (confirmNoKnownAllergies()'s own guard),
// not duplicated here.
export class ConfirmNoKnownAllergiesUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: ConfirmNoKnownAllergiesCommand): Promise<PatientProfile> {
    const profile = await this.patientProfileRepository.findById(command.patientProfileId);
    if (!profile) {
      throw new NotFoundError(`Patient profile "${command.patientProfileId}" not found.`);
    }

    profile.confirmNoKnownAllergies();

    await this.patientProfileRepository.save(profile);
    await this.eventDispatcher.dispatch(profile.releaseDomainEvents());

    return profile;
  }
}
