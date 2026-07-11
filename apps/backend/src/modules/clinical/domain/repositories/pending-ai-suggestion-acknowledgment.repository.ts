// ClinicalModule's own read-model port (docs/10-backend-architecture.md's
// hard "Clinical never depends on AIModule" rule) -- populated only via
// Clinical's own event subscriber reacting to AIModule's published events,
// never by a synchronous query into AIModule.
export interface PendingAISuggestionAcknowledgmentRepository {
  createPending(suggestionId: string, consultationSessionId: string): Promise<void>;
  acknowledge(suggestionId: string): Promise<void>;
  hasUnacknowledged(consultationSessionId: string): Promise<boolean>;
}
