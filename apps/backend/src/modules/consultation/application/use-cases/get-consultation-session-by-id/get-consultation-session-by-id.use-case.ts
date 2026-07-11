import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { GetConsultationSessionByIdQuery } from './get-consultation-session-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern). Exported for PaymentModule (Sprint
// 9) to consume -- initiateCharge needs to resolve a consultationSessionId
// to its owning Appointment (for patientId/doctorId) without ever touching
// ConsultationModule's repository directly.
export class GetConsultationSessionByIdUseCase {
  constructor(private readonly consultationSessionRepository: ConsultationSessionRepository) {}

  async execute(query: GetConsultationSessionByIdQuery): Promise<ConsultationSession | null> {
    return this.consultationSessionRepository.findById(query.consultationSessionId);
  }
}
