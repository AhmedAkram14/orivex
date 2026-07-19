export interface RecordSessionConnectionLogCommandProps {
  consultationSessionId: string;
  note: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RecordSessionConnectionLogCommand {
  readonly consultationSessionId: string;
  readonly note: string;

  constructor(props: RecordSessionConnectionLogCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.note = props.note;
  }
}
