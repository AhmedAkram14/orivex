import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import type { ListWaitlistEntriesForPatientQuery } from './list-waitlist-entries-for-patient.query.js';

// N8-Waitlist. A patient's own entries only -- the caller's patient
// profile id is always derived from their JWT account id.
export class ListWaitlistEntriesForPatientUseCase {
  constructor(
    private readonly waitlistEntryRepository: WaitlistEntryRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListWaitlistEntriesForPatientQuery): Promise<WaitlistEntry[]> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('Patient profile not found for the current account.');
    }
    return this.waitlistEntryRepository.listByPatientId(patientProfile.getId());
  }
}
