export interface StartConsultationCommandProps {
  consultationSessionId: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class StartConsultationCommand {
  readonly consultationSessionId: string;

  constructor(props: StartConsultationCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
  }
}
