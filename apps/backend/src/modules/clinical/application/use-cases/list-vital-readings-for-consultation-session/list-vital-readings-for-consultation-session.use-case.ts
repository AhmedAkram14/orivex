import type { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import type { ListVitalReadingsForConsultationSessionQuery } from './list-vital-readings-for-consultation-session.query.js';

// Pure read — mirrors ListClinicalNotesForConsultationSessionUseCase's exact
// pattern. Doctor Record Vitals UI: backs GetConsultationSummaryUseCase's
// new vitalReadings field, reusing findByConsultationSessionId (already
// added for the demo seed's own idempotency check, now serving a second
// real purpose) rather than a repository call reaching past the
// application layer.
export class ListVitalReadingsForConsultationSessionUseCase {
  constructor(private readonly vitalReadingRepository: VitalReadingRepository) {}

  async execute(query: ListVitalReadingsForConsultationSessionQuery): Promise<VitalReading[]> {
    return this.vitalReadingRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
