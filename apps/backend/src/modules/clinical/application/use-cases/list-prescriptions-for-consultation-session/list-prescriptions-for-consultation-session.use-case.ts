import type { Prescription } from '../../../domain/entities/prescription.entity.js';
import type { PrescriptionRepository } from '../../../domain/repositories/prescription.repository.js';

import type { ListPrescriptionsForConsultationSessionQuery } from './list-prescriptions-for-consultation-session.query.js';

// Pure read — mirrors the established List*UseCase pattern. Exists so the
// presentation layer (PatientDashboardController) never reaches into
// PrescriptionRepository directly.
export class ListPrescriptionsForConsultationSessionUseCase {
  constructor(private readonly prescriptionRepository: PrescriptionRepository) {}

  async execute(query: ListPrescriptionsForConsultationSessionQuery): Promise<Prescription[]> {
    return this.prescriptionRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
