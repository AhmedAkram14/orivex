import type { AISuggestion } from '../../../domain/entities/ai-suggestion.entity.js';

// Matches docs/12-openapi.md's requestAISuggestion response shape: a
// synchronous 200 with the full AISuggestion, or a 202 representing either
// queued generation or the AI-unavailable degraded mode. No 'queued' case
// is produced this sprint -- generation is always synchronous against
// AIProviderPort, and no async job-queue infrastructure exists yet
// (deliberately deferred, see ai.module.ts).
export type RequestAISuggestionResult =
  | { kind: 'generated'; suggestion: AISuggestion }
  | { kind: 'unavailable'; warnings: string[] };
