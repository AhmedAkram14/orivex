import type { AISuggestion } from '../../../domain/entities/ai-suggestion.entity.js';
import type { AISuggestionRepository } from '../../../domain/repositories/ai-suggestion.repository.js';

import type { GetAISuggestionByIdQuery } from './get-ai-suggestion-by-id.query.js';

// Pure read — returns null on absence rather than throwing (mirrors the
// established Get*ByIdUseCase pattern). Not documented as its own REST
// endpoint -- exists so the presentation layer can resolve a suggestion's
// consultationSessionId to enforce "treating doctor only" on
// recordDoctorDecision, mirroring how signPrescription/createClinicalNote
// authorize their own writes.
export class GetAISuggestionByIdUseCase {
  constructor(private readonly suggestionRepository: AISuggestionRepository) {}

  async execute(query: GetAISuggestionByIdQuery): Promise<AISuggestion | null> {
    return this.suggestionRepository.findById(query.suggestionId);
  }
}
