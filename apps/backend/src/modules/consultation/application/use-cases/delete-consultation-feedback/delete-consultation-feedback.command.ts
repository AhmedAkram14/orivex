export interface DeleteConsultationFeedbackProps {
  consultationSessionId: string;
  patientAccountId: string;
}

export class DeleteConsultationFeedbackCommand {
  readonly consultationSessionId: string;
  readonly patientAccountId: string;

  constructor(props: DeleteConsultationFeedbackProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.patientAccountId = props.patientAccountId;
  }
}
