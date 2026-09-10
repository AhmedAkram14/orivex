import type { ReviewModerationStatus } from '../../../domain/enums/review-moderation-status.enum.js';

export interface ModerateConsultationFeedbackProps {
  feedbackId: string;
  status: ReviewModerationStatus.Visible | ReviewModerationStatus.Hidden;
  reason: string;
  moderatorAccountId: string;
}

export class ModerateConsultationFeedbackCommand {
  readonly feedbackId: string;
  readonly status: ReviewModerationStatus.Visible | ReviewModerationStatus.Hidden;
  readonly reason: string;
  readonly moderatorAccountId: string;

  constructor(props: ModerateConsultationFeedbackProps) {
    this.feedbackId = props.feedbackId;
    this.status = props.status;
    this.reason = props.reason;
    this.moderatorAccountId = props.moderatorAccountId;
  }
}
