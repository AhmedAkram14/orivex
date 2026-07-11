import type { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';

export interface GenerateSuggestionRequest {
  suggestionType: AISuggestionType;
  consultationSessionId: string;
  // Server-determined clinical context only (docs/12-openapi.md: "Context
  // scoping is always server-determined, never client-supplied") -- built
  // by RequestAISuggestionUseCase from ClinicalModule/ConsultationModule's
  // own read-only query interfaces, never from client input.
  context: unknown;
}

export interface GenerateSuggestionResult {
  content: string;
  confidenceScore?: number;
  safetyFlags: string[];
  requiresAcknowledgment: boolean;
}

// Port only (docs/06-system-architecture.md Section 11: "every external
// dependency is accessed through a dedicated adapter... implementing a
// stable internal interface"). Matches docs/10-backend-architecture.md's
// AIModule dependency: "external AI provider adapters" (CLAUDE.md: Azure
// OpenAI). No concrete adapter exists yet -- no specific provider
// configuration has been chosen/documented. Per architect direction, this
// port is intentionally left unbound rather than fabricated: registering a
// fake provider or hardcoding a response would misrepresent a real external
// integration that doesn't exist yet, and would violate "AI never writes
// directly to clinical records" by inventing clinical-sounding content from
// nothing.
export interface AIProviderPort {
  generateSuggestion(request: GenerateSuggestionRequest): Promise<GenerateSuggestionResult>;
}
