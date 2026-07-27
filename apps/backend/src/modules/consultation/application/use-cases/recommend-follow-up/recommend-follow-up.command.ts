export interface RecommendFollowUpProps {
  consultationSessionId: string;
  authoringDoctorAccountId: string;
  reason: string;
  recommendedDate?: Date;
}

export class RecommendFollowUpCommand {
  readonly consultationSessionId: string;
  readonly authoringDoctorAccountId: string;
  readonly reason: string;
  readonly recommendedDate?: Date;

  constructor(props: RecommendFollowUpProps) {
    this.consultationSessionId = props.consultationSessionId;
    this.authoringDoctorAccountId = props.authoringDoctorAccountId;
    this.reason = props.reason;
    this.recommendedDate = props.recommendedDate;
  }
}
