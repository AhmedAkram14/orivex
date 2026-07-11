import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { AISuggestionDecidedEvent } from '../events/ai-suggestion-decided.event.js';
import { AISuggestionGeneratedEvent } from '../events/ai-suggestion-generated.event.js';
import { AIDomainError } from '../exceptions/ai-domain.error.js';
import { AISuggestionAlreadyDecidedError } from '../exceptions/ai-suggestion-already-decided.error.js';
import { AISuggestionDecision } from '../enums/ai-suggestion-decision.enum.js';
import { AISuggestionType } from '../enums/ai-suggestion-type.enum.js';

export interface GenerateAISuggestionProps {
  consultationSessionId: string;
  suggestionType: AISuggestionType;
  content: string;
  confidenceScore?: number;
  safetyFlags: string[];
  requiresAcknowledgment: boolean;
}

export interface ReconstituteAISuggestionProps {
  id: string;
  consultationSessionId: string;
  suggestionType: AISuggestionType;
  content: string;
  confidenceScore?: number;
  safetyFlags: string[];
  requiresAcknowledgment: boolean;
  doctorDecision?: AISuggestionDecision;
  decisionJustification?: string;
  generatedAt: Date;
  decidedAt?: Date;
}

// Aggregate root of AIModule (docs/10-backend-architecture.md's AIModule
// entry; docs/09-physical-database.md's ai_suggestions table: "Generated ->
// actioned -> immutable"). AI never writes directly to clinical records
// (CLAUDE.md) -- this aggregate only ever produces a draft; nothing here
// touches ClinicalModule's own tables. doctorDecision is settable exactly
// once, matching docs/12-openapi.md's recordDoctorDecision ("Settable
// exactly once; a second call returns 409").
export class AISuggestion {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly suggestionType: AISuggestionType,
    private readonly content: string,
    private readonly confidenceScore: number | undefined,
    private readonly safetyFlags: string[],
    private readonly requiresAcknowledgment: boolean,
    private doctorDecision: AISuggestionDecision | undefined,
    private decisionJustification: string | undefined,
    private readonly generatedAt: Date,
    private decidedAt: Date | undefined,
  ) {}

  static generate(props: GenerateAISuggestionProps): AISuggestion {
    const suggestion = new AISuggestion(
      randomUUID(),
      props.consultationSessionId,
      props.suggestionType,
      props.content,
      props.confidenceScore,
      props.safetyFlags,
      props.requiresAcknowledgment,
      undefined,
      undefined,
      new Date(),
      undefined,
    );

    suggestion.record(
      new AISuggestionGeneratedEvent(suggestion.id, suggestion.consultationSessionId, suggestion.requiresAcknowledgment),
    );
    return suggestion;
  }

  static reconstitute(props: ReconstituteAISuggestionProps): AISuggestion {
    return new AISuggestion(
      props.id,
      props.consultationSessionId,
      props.suggestionType,
      props.content,
      props.confidenceScore,
      props.safetyFlags,
      props.requiresAcknowledgment,
      props.doctorDecision,
      props.decisionJustification,
      props.generatedAt,
      props.decidedAt,
    );
  }

  // docs/12-openapi.md: "Required when rejecting a Warning-tier suggestion"
  // -- Warning-tier == requiresAcknowledgment. A second call on an
  // already-decided suggestion is the documented 409 case.
  recordDecision(decision: AISuggestionDecision, justification?: string): void {
    if (this.doctorDecision) {
      throw new AISuggestionAlreadyDecidedError(`AISuggestion "${this.id}" already has a recorded decision.`);
    }
    if (decision === AISuggestionDecision.Rejected && this.requiresAcknowledgment && !justification) {
      throw new AIDomainError('A justification is required when rejecting a Warning-tier AI suggestion.');
    }

    this.doctorDecision = decision;
    this.decisionJustification = justification;
    this.decidedAt = new Date();

    this.record(new AISuggestionDecidedEvent(this.id, this.consultationSessionId));
  }

  getId(): string {
    return this.id;
  }

  getConsultationSessionId(): string {
    return this.consultationSessionId;
  }

  getSuggestionType(): AISuggestionType {
    return this.suggestionType;
  }

  getContent(): string {
    return this.content;
  }

  getConfidenceScore(): number | undefined {
    return this.confidenceScore;
  }

  getSafetyFlags(): string[] {
    return [...this.safetyFlags];
  }

  getRequiresAcknowledgment(): boolean {
    return this.requiresAcknowledgment;
  }

  getDoctorDecision(): AISuggestionDecision | undefined {
    return this.doctorDecision;
  }

  getDecisionJustification(): string | undefined {
    return this.decisionJustification;
  }

  getGeneratedAt(): Date {
    return this.generatedAt;
  }

  getDecidedAt(): Date | undefined {
    return this.decidedAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
