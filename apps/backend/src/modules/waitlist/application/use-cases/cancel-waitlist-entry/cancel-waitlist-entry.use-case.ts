import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import type { CancelWaitlistEntryCommand } from './cancel-waitlist-entry.command.js';

// N8-Waitlist. 404, not 403, for someone else's entry -- never confirms to
// a caller whether a waitlist entry id belonging to another patient exists
// at all, matching this codebase's "never leak existence" convention
// (identical to MessageThread/Dispute's own ownership checks).
export class CancelWaitlistEntryUseCase {
  constructor(
    private readonly waitlistEntryRepository: WaitlistEntryRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(command: CancelWaitlistEntryCommand): Promise<WaitlistEntry> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('Patient profile not found for the current account.');
    }

    const entry = await this.waitlistEntryRepository.findById(command.waitlistEntryId);
    if (!entry || entry.getPatientId() !== patientProfile.getId()) {
      throw new NotFoundError(`Waitlist entry "${command.waitlistEntryId}" not found.`);
    }

    entry.cancel();
    await this.waitlistEntryRepository.update(entry);
    return entry;
  }
}
