export interface SubmitConsultationFeedbackProps {
  consultationSessionId: string;
  patientAccountId: string;
  rating: number;
  comment?: string;
}

export class SubmitConsultationFeedbackCommand {
  readonly consultationSessionId: string;
  readonly patientAccountId: string;
  readonly rating: number;
  readonly comment?: string;

  constructor(props: SubmitConsultationFeedbackProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.patientAccountId = props.patientAccountId;
    this.rating = props.rating;
    this.comment = props.comment;
  }
}
