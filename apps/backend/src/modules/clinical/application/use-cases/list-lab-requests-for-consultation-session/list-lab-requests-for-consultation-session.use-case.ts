import type { LabRequest } from '../../../domain/entities/lab-request.entity.js';
import type { LabRequestRepository } from '../../../domain/repositories/lab-request.repository.js';

import type { ListLabRequestsForConsultationSessionQuery } from './list-lab-requests-for-consultation-session.query.js';

// Pure read — mirrors ListPrescriptionsForConsultationSessionUseCase exactly.
export class ListLabRequestsForConsultationSessionUseCase {
  constructor(private readonly labRequestRepository: LabRequestRepository) {}

  async execute(query: ListLabRequestsForConsultationSessionQuery): Promise<LabRequest[]> {
    return this.labRequestRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
