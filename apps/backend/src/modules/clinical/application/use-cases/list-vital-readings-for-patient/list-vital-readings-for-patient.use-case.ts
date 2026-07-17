import type { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import type { ListVitalReadingsForPatientQuery } from './list-vital-readings-for-patient.query.js';

// Pure read -- mirrors ListNotificationsForAccountUseCase's pattern.
export class ListVitalReadingsForPatientUseCase {
  constructor(private readonly vitalReadingRepository: VitalReadingRepository) {}

  async execute(query: ListVitalReadingsForPatientQuery): Promise<VitalReading[]> {
    return this.vitalReadingRepository.findByPatientId(query.patientId);
  }
}
