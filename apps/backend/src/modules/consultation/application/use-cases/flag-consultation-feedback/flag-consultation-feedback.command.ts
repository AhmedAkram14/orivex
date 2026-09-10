export interface FlagConsultationFeedbackProps {
  feedbackId: string;
  callerAccountId: string;
  reason: string;
}

export class FlagConsultationFeedbackCommand {
  readonly feedbackId: string;
  readonly callerAccountId: string;
  readonly reason: string;

  constructor(props: FlagConsultationFeedbackProps) {
    this.feedbackId = props.feedbackId;
    this.callerAccountId = props.callerAccountId;
    this.reason = props.reason;
  }
}
