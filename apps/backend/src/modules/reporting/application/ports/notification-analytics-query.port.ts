import type { ReportFilter } from '../dto/report-filter.js';

// Reminder success/failure is deliberately absent -- the BullMQ reminder
// worker only logs failures via Pino today, nothing is persisted. Adding
// that persistence is worker/infra scope, out of bounds for a read-only
// reporting module (see roadmap completion note).
export interface NotificationAnalyticsResult {
  sent: number;
  unread: number;
  read: number;
}

export interface NotificationAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter): Promise<NotificationAnalyticsResult>;
}
