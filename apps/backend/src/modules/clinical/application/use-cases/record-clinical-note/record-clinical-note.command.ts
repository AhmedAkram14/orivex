export interface RecordClinicalNoteCommandProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  content: string;
  addendumOfNoteId?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RecordClinicalNoteCommand {
  readonly consultationSessionId: string;
  readonly authoringDoctorId: string;
  readonly content: string;
  readonly addendumOfNoteId?: string;

  constructor(props: RecordClinicalNoteCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.authoringDoctorId = props.authoringDoctorId;
    this.content = props.content;
    this.addendumOfNoteId = props.addendumOfNoteId;
  }
}
