import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { VerificationCase } from '../../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../../domain/repositories/verification-case.repository.js';

import type { SubmitDoctorVerificationCommand } from './submit-doctor-verification.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// trust.module.ts only.
//
// Orchestrates: verify the referenced DoctorProfile exists (via
// DoctorModule's own exported use case — module-to-module calls only
// through a published interface, never another module's repository) ->
// VerificationCase.submit() -> persist -> dispatch. Document asset ids are
// referenced by id only (docs/11-api-contracts.md's "reference by ID via
// AssetModule" pattern) and are enforced to actually exist by the database
// foreign key on VerificationDocument, not a cross-module existence query.
export class SubmitDoctorVerificationUseCase {
  constructor(
    private readonly verificationCaseRepository: VerificationCaseRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: SubmitDoctorVerificationCommand): Promise<VerificationCase> {
    const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.doctorId });
    if (!doctorProfile) {
      throw new NotFoundError(`Doctor profile "${command.doctorId}" not found.`);
    }

    const verificationCase = VerificationCase.submit({
      doctorId: command.doctorId,
      licenseNumber: command.licenseNumber,
      specialtyCode: command.specialtyCode,
      documentAssetIds: command.documentAssetIds,
    });

    await this.verificationCaseRepository.save(verificationCase);
    await this.eventDispatcher.dispatch(verificationCase.releaseDomainEvents());

    return verificationCase;
  }
}
