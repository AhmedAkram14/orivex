import type { ReviewModerationStatus } from '../../../domain/enums/review-moderation-status.enum.js';

export interface ListConsultationFeedbackByModerationStatusQueryProps {
  status: ReviewModerationStatus;
  page: number;
  limit: number;
}

export class ListConsultationFeedbackByModerationStatusQuery {
  readonly status: ReviewModerationStatus;
  readonly page: number;
  readonly limit: number;

  constructor(props: ListConsultationFeedbackByModerationStatusQueryProps) {
    this.status = props.status;
    this.page = props.page;
    this.limit = props.limit;
  }
}
