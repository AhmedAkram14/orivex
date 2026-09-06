import type { HealthGraph } from '../../../domain/entities/health-graph.entity.js';
import type { HealthGraphRepository } from '../../../domain/repositories/health-graph.repository.js';

export interface GetHealthGraphByIdQuery {
  healthGraphId: string;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Journey stage-advance fix (ORIVEX Remaining Work
// Audit, P0 C5): the one place a HealthJourney's healthGraphId is resolved
// back to its owning patientId (HealthGraph.getPatientId()), so
// JourneyController can run the same doctor-relationship + consent check
// every other clinical read/write already uses.
export class GetHealthGraphByIdUseCase {
  constructor(private readonly healthGraphRepository: HealthGraphRepository) {}

  async execute(query: GetHealthGraphByIdQuery): Promise<HealthGraph | null> {
    return this.healthGraphRepository.findById(query.healthGraphId);
  }
}
