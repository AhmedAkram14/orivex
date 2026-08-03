import { Injectable } from '@nestjs/common';
import { Prisma, VerificationStatus as PrismaVerificationStatus, VerificationSubjectType } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';
import type { VerificationAnalyticsQueryPort, VerificationAnalyticsResult } from '../../application/ports/verification-analytics-query.port.js';

@Injectable()
export class PrismaVerificationAnalyticsQueryService implements VerificationAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(filter: ReportFilter): Promise<VerificationAnalyticsResult> {
    const where: Prisma.VerificationCaseWhereInput = {
      ...(filter.dateFrom || filter.dateTo
        ? { submittedAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {}),
      ...(filter.verificationStatus ? { status: filter.verificationStatus.toUpperCase() as PrismaVerificationStatus } : {}),
    };

    const [statusRows, subjectRows, avgReviewTime] = await Promise.all([
      this.prisma.verificationCase.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.verificationCase.groupBy({ by: ['subjectType'], where, _count: { _all: true } }),
      this.queryAverageReviewTime(filter),
    ]);

    const countFor = (status: PrismaVerificationStatus): number => statusRows.find((row) => row.status === status)?._count._all ?? 0;
    const countForSubject = (subjectType: VerificationSubjectType): number =>
      subjectRows.find((row) => row.subjectType === subjectType)?._count._all ?? 0;

    return {
      pending:
        countFor(PrismaVerificationStatus.SUBMITTED) +
        countFor(PrismaVerificationStatus.UNDER_REVIEW) +
        countFor(PrismaVerificationStatus.MORE_INFO_NEEDED) +
        countFor(PrismaVerificationStatus.RE_VERIFICATION_DUE),
      approved: countFor(PrismaVerificationStatus.APPROVED),
      rejected: countFor(PrismaVerificationStatus.REJECTED),
      suspended: countFor(PrismaVerificationStatus.SUSPENDED),
      averageReviewTimeHours: avgReviewTime,
      doctorCases: countForSubject(VerificationSubjectType.DOCTOR),
      patientCases: countForSubject(VerificationSubjectType.PATIENT),
    };
  }

  private async queryAverageReviewTime(filter: ReportFilter): Promise<number | null> {
    const conditions: Prisma.Sql[] = [Prisma.sql`"decidedAt" IS NOT NULL`];
    if (filter.dateFrom) conditions.push(Prisma.sql`"submittedAt" >= ${filter.dateFrom}`);
    if (filter.dateTo) conditions.push(Prisma.sql`"submittedAt" <= ${filter.dateTo}`);
    if (filter.verificationStatus) conditions.push(Prisma.sql`status = ${filter.verificationStatus.toUpperCase()}::"VerificationStatus"`);

    const rows = await this.prisma.$queryRaw<Array<{ avgHours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("decidedAt" - "submittedAt")) / 3600) AS "avgHours"
      FROM "VerificationCase"
      WHERE ${Prisma.join(conditions, ' AND ')}
    `;
    return rows[0]?.avgHours ?? null;
  }
}
