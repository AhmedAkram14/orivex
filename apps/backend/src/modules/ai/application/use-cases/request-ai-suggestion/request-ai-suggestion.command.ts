import type { AISuggestionType } from '../../../domain/enums/ai-suggestion-type.enum.js';

export interface RequestAISuggestionCommandProps {
  consultationSessionId: string;
  suggestionType: AISuggestionType;
  requestingDoctorId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style). requestingDoctorId
// is resolved by the presentation layer from the caller's JWT before this
// command is ever constructed; this use case separately re-validates it
// against the consultation's actual treating doctor.
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
