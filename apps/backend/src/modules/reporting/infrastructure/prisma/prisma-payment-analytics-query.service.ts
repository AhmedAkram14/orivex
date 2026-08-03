import { Injectable } from '@nestjs/common';
import { Prisma, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';
import type { DateWindow } from '../../application/dto/previous-period.js';
import type { PaymentAnalyticsQueryPort, PaymentAnalyticsResult } from '../../application/ports/payment-analytics-query.port.js';

@Injectable()
export class PrismaPaymentAnalyticsQueryService implements PaymentAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(filter: ReportFilter, currentWindow: DateWindow, previousWindow?: DateWindow): Promise<PaymentAnalyticsResult> {
    const baseWhere: Prisma.PaymentTransactionWhereInput = {
      ...(filter.doctorId ? { doctorId: filter.doctorId } : {}),
      ...(filter.specialtyId ? { doctorProfile: { specialtyId: filter.specialtyId } } : {}),
      ...(filter.paymentStatus ? { status: filter.paymentStatus.toUpperCase() as PrismaPaymentStatus } : {}),
    };
    const currentWhere: Prisma.PaymentTransactionWhereInput = {
      ...baseWhere,
      createdAt: { gte: currentWindow.from, lte: currentWindow.to },
    };

    const [statusRows, revenueAgg, previousRevenueAgg] = await Promise.all([
      this.prisma.paymentTransaction.groupBy({ by: ['status'], where: currentWhere, _count: { _all: true } }),
      this.prisma.paymentTransaction.aggregate({
        where: { ...currentWhere, status: { in: [PrismaPaymentStatus.SUCCEEDED, PrismaPaymentStatus.SETTLED] } },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { _all: true },
      }),
      previousWindow
        ? this.prisma.paymentTransaction.aggregate({
            where: {
              ...baseWhere,
              createdAt: { gte: previousWindow.from, lte: previousWindow.to },
              status: { in: [PrismaPaymentStatus.SUCCEEDED, PrismaPaymentStatus.SETTLED] },
            },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
    ]);

    const countFor = (status: PrismaPaymentStatus): number => statusRows.find((row) => row.status === status)?._count._all ?? 0;
    const transactions = statusRows.reduce((sum, row) => sum + row._count._all, 0);
    const revenue = Number(revenueAgg._sum.amount ?? 0);
    const previousRevenue = previousRevenueAgg ? Number(previousRevenueAgg._sum.amount ?? 0) : null;
    const revenueGrowthPercent =
      previousRevenue !== null && previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;

    return {
      revenue,
      revenueGrowthPercent,
      transactions,
      successfulPayments: countFor(PrismaPaymentStatus.SUCCEEDED) + countFor(PrismaPaymentStatus.SETTLED),
      failedPayments: countFor(PrismaPaymentStatus.FAILED),
      refunds: countFor(PrismaPaymentStatus.REFUNDED),
      averageConsultationPrice: revenueAgg._avg.amount ? Number(revenueAgg._avg.amount) : null,
    };
  }
}
