export interface RecordLabRequestProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  testName: string;
  clinicalReason?: string;
  instructions?: string;
}

export class RecordLabRequestCommand {
  readonly consultationSessionId: string;
  readonly authoringDoctorId: string;
  readonly testName: string;
  readonly clinicalReason?: string;
  readonly instructions?: string;

  constructor(props: RecordLabRequestProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.authoringDoctorId = props.authoringDoctorId;
    this.testName = props.testName;
    this.clinicalReason = props.clinicalReason;
    this.instructions = props.instructions;
  }
}
