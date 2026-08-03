import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';
import type { NotificationAnalyticsQueryPort, NotificationAnalyticsResult } from '../../application/ports/notification-analytics-query.port.js';

@Injectable()
export class PrismaNotificationAnalyticsQueryService implements NotificationAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(filter: ReportFilter): Promise<NotificationAnalyticsResult> {
    const where: Prisma.NotificationWhereInput = {
      ...(filter.dateFrom || filter.dateTo
        ? { createdAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {}),
    };

    const [sent, unread] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, read: false } }),
    ]);

    return { sent, unread, read: sent - unread };
  }
}
