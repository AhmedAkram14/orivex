import type { AISuggestion } from '../entities/ai-suggestion.entity.js';

export interface AISuggestionRepository {
  findById(id: string): Promise<AISuggestion | null>;
  save(suggestion: AISuggestion): Promise<void>;
}
