import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { HealthPassportEntryRepository } from '../../../domain/repositories/health-passport-entry.repository.js';

import type { DeleteHealthPassportEntryCommand } from './delete-health-passport-entry.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// patient.module.ts only. Ownership check mirrors every other own-resource
// delete in this codebase: the same 404, never a distinct 403, whether the
// entry doesn't exist or belongs to someone else -- never confirms to a
// caller that a health passport entry id belonging to another patient
// exists at all.
export class DeleteHealthPassportEntryUseCase {
  constructor(private readonly healthPassportEntryRepository: HealthPassportEntryRepository) {}

  async execute(command: DeleteHealthPassportEntryCommand): Promise<void> {
    const entry = await this.healthPassportEntryRepository.findById(command.entryId);
    if (!entry || entry.getPatientId() !== command.patientId) {
      throw new NotFoundError(`Health passport entry "${command.entryId}" not found.`);
    }

    await this.healthPassportEntryRepository.delete(command.entryId);
  }
}
