import type { AISuggestionType } from '../../../domain/enums/ai-suggestion-type.enum.js';

export interface RequestAISuggestionCommandProps {
  consultationSessionId: string;
  suggestionType: AISuggestionType;
  requestingDoctorId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style). requestingDoctorId
// is an additive field -- Authentication isn't built yet (mirrors
// SignPrescriptionCommand's authoringDoctorId precedent).
export class RequestAISuggestionCommand {
  readonly consultationSessionId: string;
  readonly suggestionType: AISuggestionType;
  readonly requestingDoctorId: string;

  constructor(props: RequestAISuggestionCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.suggestionType = props.suggestionType;
    this.requestingDoctorId = props.requestingDoctorId;
  }
}
