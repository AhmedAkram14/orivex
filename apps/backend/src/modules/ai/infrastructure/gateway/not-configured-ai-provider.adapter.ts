import { Injectable } from '@nestjs/common';

import { AIDomainError } from '../../domain/exceptions/ai-domain.error.js';
import type { AIProviderPort, GenerateSuggestionRequest, GenerateSuggestionResult } from '../../application/ports/ai-provider.port.js';

// Explicit stand-in for the "external AI provider adapter" (docs/10-
// backend-architecture.md's AIModule dependency; CLAUDE.md names Azure
// OpenAI as the eventual provider) -- no provider configuration has been
// documented/approved yet. This performs no generation and never
// fabricates a suggestion; it fails loudly and explicitly the moment
// generateSuggestion() is actually invoked, so AIModule can stay fully
// wired into the running application (architect direction, mirrors
// Payment's NotConfiguredPaymentGatewayAdapter precedent) without silently
// pretending AI suggestions work. RequestAISuggestionUseCase treats this
// failure as docs/12-openapi.md's documented AI-unavailable 202 degraded
// mode, not a 500. Replace with a real adapter the moment a provider is
// chosen -- AIProviderPort and the use cases do not change.
@Injectable()
export class NotConfiguredAIProviderAdapter implements AIProviderPort {
  async generateSuggestion(_request: GenerateSuggestionRequest): Promise<GenerateSuggestionResult> {
    throw new AIDomainError(
      'AIProviderPort has no configured provider -- no AI provider has been selected/configured yet. ' +
        'AI suggestions cannot be generated until a real adapter is chosen and bound.',
    );
  }
}
