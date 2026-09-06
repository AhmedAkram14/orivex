import type { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

export interface GetHealthJourneyByIdQuery {
  healthJourneyId: string;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Journey stage-advance fix (ORIVEX Remaining Work
// Audit, P0 C5): JourneyController resolves a journey by id first (to find
// its healthGraphId, and from there the owning patient) before authorizing
// the caller and calling UpdateJourneyStageUseCase.
export class GetHealthJourneyByIdUseCase {
  constructor(private readonly healthJourneyRepository: HealthJourneyRepository) {}

  async execute(query: GetHealthJourneyByIdQuery): Promise<HealthJourney | null> {
    return this.healthJourneyRepository.findById(query.healthJourneyId);
  }
}
