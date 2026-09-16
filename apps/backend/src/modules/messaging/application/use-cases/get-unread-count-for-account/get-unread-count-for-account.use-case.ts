import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';

import type { GetUnreadCountForAccountQuery } from './get-unread-count-for-account.query.js';

// Re-threading (Phase 1): backs the sidebar's single unread-count badge.
// Named for the repository method it backs (countUnreadForAccount), not
// "...AcrossThreads" -- there is no thread-id list involved anywhere in
// this path, by design (see MessageRepository.countUnreadForAccount's own
// comment on why "list threads, then count per thread" is the wrong shape).
export class GetUnreadCountForAccountUseCase {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: GetUnreadCountForAccountQuery): Promise<number> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (patientProfile) {
      return this.messageRepository.countUnreadForAccount(query.callerAccountId, 'patient');
    }
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (doctorProfile) {
      return this.messageRepository.countUnreadForAccount(query.callerAccountId, 'doctor');
    }
    return 0;
  }
}
