import type { AISuggestionDecision } from '../../../domain/enums/ai-suggestion-decision.enum.js';

export interface RecordDoctorDecisionCommandProps {
  suggestionId: string;
  decision: AISuggestionDecision;
  justification?: string;
}

export class RecordDoctorDecisionCommand {
  readonly suggestionId: string;
  readonly decision: AISuggestionDecision;
  readonly justification?: string;

  constructor(props: RecordDoctorDecisionCommandProps) {
    this.suggestionId = props.suggestionId;
    this.decision = props.decision;
    this.justification = props.justification;
  }
}
