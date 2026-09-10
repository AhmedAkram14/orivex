export interface RecordClinicalNoteCommandProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  addendumOfNoteId?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class RecordClinicalNoteCommand {
  readonly consultationSessionId: string;
  readonly authoringDoctorId: string;
  readonly subjective: string;
  readonly objective: string;
  readonly assessment: string;
  readonly plan: string;
  readonly addendumOfNoteId?: string;

  constructor(props: RecordClinicalNoteCommandProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.authoringDoctorId = props.authoringDoctorId;
    this.subjective = props.subjective;
    this.objective = props.objective;
    this.assessment = props.assessment;
    this.plan = props.plan;
    this.addendumOfNoteId = props.addendumOfNoteId;
  }
}
