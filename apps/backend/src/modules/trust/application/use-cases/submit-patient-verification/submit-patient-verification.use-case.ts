import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';
import { PatientIdentityDetails } from '../../../domain/value-objects/patient-identity-details.js';

import type { SubmitPatientVerificationCommand } from './submit-patient-verification.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// trust.module.ts only. Mirrors SubmitDoctorVerificationUseCase's own shape
// exactly (Onboarding Redesign, 2026-07-21 proposal, Stage O.2) -- the
// PatientProfile lookup is existence-checking only; subjectAccountId comes
// from the command (the caller's own account).
export class SubmitPatientVerificationUseCase {
  constructor(
    private readonly verificationCaseRepository: VerificationCaseRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
  ) {}

  async execute(command: SubmitPatientVerificationCommand): Promise<VerificationCase> {
    const patientProfile = await this.getPatientProfileByIdUseCase.execute({
      patientProfileId: command.patientProfileId,
    });
    if (!patientProfile) {
      throw new NotFoundError(`Patient profile "${command.patientProfileId}" not found.`);
    }

    const verificationCase = VerificationCase.submit({
      subjectAccountId: command.subjectAccountId,
      subjectDetails: PatientIdentityDetails.create(),
      documentAssetIds: command.documentAssetIds,
    });

    await this.verificationCaseRepository.save(verificationCase);
    await this.eventDispatcher.dispatch(verificationCase.releaseDomainEvents());

    return verificationCase;
  }
}
