export interface UpdateConsultationFeedbackProps {
  consultationSessionId: string;
  patientAccountId: string;
  rating: number;
  comment?: string;
  communicationRating?: number;
  punctualityRating?: number;
  thoroughnessRating?: number;
}

export class UpdateConsultationFeedbackCommand {
  readonly consultationSessionId: string;
  readonly patientAccountId: string;
  readonly rating: number;
  readonly comment?: string;
  readonly communicationRating?: number;
  readonly punctualityRating?: number;
  readonly thoroughnessRating?: number;

  constructor(props: UpdateConsultationFeedbackProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.patientAccountId = props.patientAccountId;
    this.rating = props.rating;
    this.comment = props.comment;
    this.communicationRating = props.communicationRating;
    this.punctualityRating = props.punctualityRating;
    this.thoroughnessRating = props.thoroughnessRating;
  }
}
