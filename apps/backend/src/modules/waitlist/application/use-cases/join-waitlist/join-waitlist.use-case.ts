import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { WaitlistDomainError } from '../../../domain/exceptions/waitlist-domain.error.js';
import { WaitlistEntry } from '../../../domain/entities/waitlist-entry.entity.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

import type { JoinWaitlistCommand } from './join-waitlist.command.js';

// N8-Waitlist. A patient joins the waitlist for a specific doctor and date
// range; the caller's own patient profile id is always derived from their
// JWT account id, never trusted from the request body. Only one active
// (Waiting/Notified) entry per patient-doctor pair at a time -- joining
// again while one is already active would just create silent duplicate
// notifications for the same opportunity, not a meaningful new request.
export class JoinWaitlistUseCase {
  constructor(
    private readonly waitlistEntryRepository: WaitlistEntryRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
  ) {}

  async execute(command: JoinWaitlistCommand): Promise<WaitlistEntry> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!patientProfile) {
      throw new NotFoundError('Patient profile not found for the current account.');
    }

    const doctorProfile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: command.doctorId });
    if (!doctorProfile) {
      throw new NotFoundError(`Doctor "${command.doctorId}" not found.`);
    }

    const alreadyActive = await this.waitlistEntryRepository.hasActiveEntry(patientProfile.getId(), command.doctorId);
    if (alreadyActive) {
      throw new WaitlistDomainError('You already have an active waitlist entry for this doctor.');
    }

    const entry = WaitlistEntry.join({
      patientId: patientProfile.getId(),
      doctorId: command.doctorId,
      consultationType: command.consultationType,
      earliestAcceptableAt: command.earliestAcceptableAt,
      latestAcceptableAt: command.latestAcceptableAt,
    });
    await this.waitlistEntryRepository.save(entry);
    return entry;
  }
}
