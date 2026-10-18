/** One admin work queue as the Overview's "Needs attention" band sees it. */
export interface WorkQueueSnapshot {
  count: number;
  /** When the longest-waiting item entered the queue; null when the queue is empty or no entry time is recorded. */
  oldestWaitingSince: Date | null;
}

/**
 * Read-only counts of the admin work queues, each scoped exactly like the
 * queue page an Overview card links to, so the number on the card is the
 * number of rows the admin lands on.
 */
export interface AdminQueueQueryPort {
  /** GET /admin/verification-queue's default set: SUBMITTED, UNDER_REVIEW and MORE_INFO_NEEDED cases, both subject types, oldest by submittedAt. */
  getPendingVerifications(): Promise<WorkQueueSnapshot>;
  /** GET /admin/disputes' default set: OPEN disputes, every category, oldest by createdAt. */
  getOpenDisputes(): Promise<WorkQueueSnapshot>;
  /**
   * GET /admin/reviews' default set: FLAGGED reviews. ConsultationFeedback
   * records no time of flagging (moderatedAt is the admin's decision, and a
   * review's createdAt is when it was written, not when it was flagged), so
   * oldestWaitingSince is always null rather than a misleading age.
   */
  getFlaggedReviews(): Promise<WorkQueueSnapshot>;
}
