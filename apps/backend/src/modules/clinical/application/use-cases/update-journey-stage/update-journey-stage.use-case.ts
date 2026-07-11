import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { HealthJourney } from '../../../domain/entities/health-journey.entity.js';
import type { HealthJourneyRepository } from '../../../domain/repositories/health-journey.repository.js';

import type { UpdateJourneyStageCommand } from './update-journey-stage.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// clinical.module.ts only. Matches docs/10-backend-architecture.md's
// ClinicalModule public contract ("Commands accepted: ...
// UpdateJourneyStage, ..."). Internal only -- no REST endpoint documents
// this transition yet.
export class UpdateJourneyStageUseCase {
  constructor(
    private readonly healthJourneyRepository: HealthJourneyRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: UpdateJourneyStageCommand): Promise<HealthJourney> {
    const journey = await this.healthJourneyRepository.findById(command.healthJourneyId);
    if (!journey) {
      throw new NotFoundError(`HealthJourney "${command.healthJourneyId}" not found.`);
    }

    journey.advanceStage(command.nextStage);

    await this.healthJourneyRepository.save(journey);
    await this.eventDispatcher.dispatch(journey.releaseDomainEvents());

    return journey;
  }
}
