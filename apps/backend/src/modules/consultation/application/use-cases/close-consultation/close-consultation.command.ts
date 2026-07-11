import type { ConsultationCompletionReason } from '../../../domain/enums/consultation-completion-reason.enum.js';

export interface CloseConsultationCommandProps {
  consultationSessionId: string;
  completionReason: ConsultationCompletionReason;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class CloseConsultationCommand {
  readonly consultationSessionId: string;
  readonly completionReason: ConsultationCompletionReason;

  constructor(props: CloseConsultationCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.completionReason = props.completionReason;
  }
}
