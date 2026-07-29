export interface UpdateConsultationFeedbackProps {
  consultationSessionId: string;
  patientAccountId: string;
  rating: number;
  comment?: string;
}

export class UpdateConsultationFeedbackCommand {
  readonly consultationSessionId: string;
  readonly patientAccountId: string;
  readonly rating: number;
  readonly comment?: string;

  constructor(props: UpdateConsultationFeedbackProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.patientAccountId = props.patientAccountId;
    this.rating = props.rating;
    this.comment = props.comment;
  }
}
