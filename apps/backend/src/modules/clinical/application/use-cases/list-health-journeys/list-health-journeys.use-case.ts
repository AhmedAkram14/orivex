import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import type { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import type { ListHealthJourneysQuery } from './list-health-journeys.query.js';

// Matches docs/12-openapi.md's GET /patients/{id}/journeys exactly.
export class ListHealthJourneysUseCase {
  constructor(
    private readonly healthGraphRepository: HealthGraphRepository,
    private readonly healthJourneyRepository: HealthJourneyRepository,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
  ) {}

  async execute(query: ListHealthJourneysQuery): Promise<HealthJourney[]> {
    const patient = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: query.patientId });
    if (!patient) {
      throw new NotFoundError(`Patient profile "${query.patientId}" not found.`);
    }

    const graph = await this.healthGraphRepository.findByPatientId(query.patientId);
    if (!graph) {
      return [];
    }

    return this.healthJourneyRepository.findByHealthGraphId(graph.getId(), query.status);
  }
}
