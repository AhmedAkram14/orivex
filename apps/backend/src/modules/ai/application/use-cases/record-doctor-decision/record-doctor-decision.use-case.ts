import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import type { AISuggestion } from '../../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionRepository } from '../../../domain/repositories/ai-suggestion.repository.js';

import type { RecordDoctorDecisionCommand } from './record-doctor-decision.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// ai.module.ts only. Matches docs/12-openapi.md's recordDoctorDecision
// exactly. This is the client's direct entry point for recording a
// decision (not routed through ClinicalModule) -- publishing
// AISuggestionDecidedEvent here is what lets ClinicalModule's own event
// subscriber clear its pending-acknowledgment gate without AIModule ever
// calling into Clinical.
export class RecordDoctorDecisionUseCase {
  constructor(
    private readonly suggestionRepository: AISuggestionRepository,
    private readonly eventDispatcher: DomainEventDispatcher,
  ) {}

  async execute(command: RecordDoctorDecisionCommand): Promise<AISuggestion> {
    const suggestion = await this.suggestionRepository.findById(command.suggestionId);
    if (!suggestion) {
      throw new NotFoundError(`AISuggestion "${command.suggestionId}" not found.`);
    }

    suggestion.recordDecision(command.decision, command.justification);

    await this.suggestionRepository.save(suggestion);
    await this.eventDispatcher.dispatch(suggestion.releaseDomainEvents());

    return suggestion;
  }
}
