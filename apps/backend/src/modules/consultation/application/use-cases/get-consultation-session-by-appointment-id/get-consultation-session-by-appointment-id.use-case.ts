import type { ConsultationSession } from '../../../domain/entities/consultation-session.entity.js';
import type { ConsultationSessionRepository } from '../../../domain/repositories/consultation-session.repository.js';

import type { GetConsultationSessionByAppointmentIdQuery } from './get-consultation-session-by-appointment-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern). Exported for ClinicalModule to
// resolve an appointment's session (e.g. to find that session's
// prescriptions for the patient dashboard) without ever touching
// ConsultationModule's repository directly.
export class GetConsultationSessionByAppointmentIdUseCase {
  constructor(private readonly consultationSessionRepository: ConsultationSessionRepository) {}

  async execute(query: GetConsultationSessionByAppointmentIdQuery): Promise<ConsultationSession | null> {
    return this.consultationSessionRepository.findByAppointmentId(query.appointmentId);
  }
}
