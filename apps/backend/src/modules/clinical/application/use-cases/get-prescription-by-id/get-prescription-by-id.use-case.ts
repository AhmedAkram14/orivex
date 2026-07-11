import type { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';

import type { GetPrescriptionByIdQuery } from './get-prescription-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern). Matches docs/12-openapi.md's
// GET /prescriptions/{id} (getPrescription).
export class GetPrescriptionByIdUseCase {
  constructor(private readonly prescriptionRepository: PrescriptionRepository) {}

  async execute(query: GetPrescriptionByIdQuery): Promise<Prescription | null> {
    return this.prescriptionRepository.findById(query.prescriptionId);
  }
}
