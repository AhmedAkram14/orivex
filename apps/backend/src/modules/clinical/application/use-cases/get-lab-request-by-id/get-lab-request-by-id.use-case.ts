import type { LabRequest } from '../../../domain/entities/lab-request.entity.js';
import type { LabRequestRepository } from '../../../domain/repositories/lab-request.repository.js';

import type { GetLabRequestByIdQuery } from './get-lab-request-by-id.query.js';

// Pure read — mirrors GetPrescriptionByIdUseCase exactly.
export class GetLabRequestByIdUseCase {
  constructor(private readonly labRequestRepository: LabRequestRepository) {}

  async execute(query: GetLabRequestByIdQuery): Promise<LabRequest | null> {
    return this.labRequestRepository.findById(query.labRequestId);
  }
}
