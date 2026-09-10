import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import type { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { ListMessageThreadsForAccountQuery } from './list-message-threads-for-account.query.js';

// I7 -- Messaging: the caller's own inbox -- every thread they're a party
// to, patient or doctor side alike (a doctor sees their threads from
// findByDoctorId, a patient theirs from findByPatientId; an account is
// never both, so there's no need to merge/dedupe).
export class ListMessageThreadsForAccountUseCase {
  constructor(
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: ListMessageThreadsForAccountQuery): Promise<MessageThread[]> {
    const patientProfile = await this.getPatientProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (patientProfile) {
      return this.messageThreadRepository.findByPatientId(patientProfile.getId());
    }
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (doctorProfile) {
      return this.messageThreadRepository.findByDoctorId(doctorProfile.getId());
    }
    return [];
  }
}
