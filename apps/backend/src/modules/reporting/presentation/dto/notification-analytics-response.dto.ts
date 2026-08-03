import type { NotificationAnalyticsResult } from '../../application/ports/notification-analytics-query.port.js';

export class NotificationAnalyticsResponseDto {
  sent!: number;
  unread!: number;
  read!: number;

  static fromResult(result: NotificationAnalyticsResult): NotificationAnalyticsResponseDto {
    return Object.assign(new NotificationAnalyticsResponseDto(), result);
  }
}
