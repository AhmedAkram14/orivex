import type { ReportFilter } from '../../dto/report-filter.js';
import type { NotificationAnalyticsQueryPort, NotificationAnalyticsResult } from '../../ports/notification-analytics-query.port.js';

export class GetNotificationAnalyticsUseCase {
  constructor(private readonly notificationAnalyticsQuery: NotificationAnalyticsQueryPort) {}

  execute(filter: ReportFilter): Promise<NotificationAnalyticsResult> {
    return this.notificationAnalyticsQuery.getAnalytics(filter);
  }
}
