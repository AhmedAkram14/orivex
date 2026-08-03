import { Injectable } from '@nestjs/common';
import { Prisma, AppointmentStatus as PrismaAppointmentStatus, ConsultationType as PrismaConsultationType } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type {
  AnalyticsBucket,
  AppointmentAnalyticsQueryPort,
  AppointmentAnalyticsResult,
} from '../../application/ports/appointment-analytics-query.port.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';

const BUCKET_TRUNC: Record<AnalyticsBucket, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
};

// Every query here filters on Appointment.scheduledAt, not createdAt --
// "when is the patient being seen" (an operational/staffing question),
// deliberately not "when was the booking UI used" (a different, also valid,
// but not what this dashboard asks). ReportingModule queries Prisma
// directly rather than through AppointmentRepository: that port is a
// write-oriented aggregate repo owned by ConsultationModule and not exported
// for cross-module DI (Nest module encapsulation), and bolting ad-hoc
// groupBy methods onto it was explicitly what GetPlatformKpisUseCase's own
// comment warned against. This mirrors DoctorModule's own
// PrismaDoctorDirectoryQueryService precedent: a dedicated, read-only,
// same-database query service for a query-side (CQRS read model) concern.
@Injectable()
export class PrismaAppointmentAnalyticsQueryService implements AppointmentAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(filter: ReportFilter): Prisma.AppointmentWhereInput {
    return {
      ...(filter.dateFrom || filter.dateTo
        ? { scheduledAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {}),
      ...(filter.doctorId ? { doctorId: filter.doctorId } : {}),
      ...(filter.specialtyId ? { doctorProfile: { specialtyId: filter.specialtyId } } : {}),
      ...(filter.consultationType
        ? { consultationType: filter.consultationType.toUpperCase() as PrismaConsultationType }
        : {}),
    };
  }

  async getAnalytics(filter: ReportFilter, bucket: AnalyticsBucket): Promise<AppointmentAnalyticsResult> {
    const where = this.buildWhere(filter);

    const [statusCounts, typeCounts, totalCount, upcomingCount, byBucket, peakHours, peakDays] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.appointment.groupBy({ by: ['consultationType'], where, _count: { _all: true } }),
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.count({
        where: {
          ...where,
          scheduledAt: { gt: new Date() },
          status: { in: [PrismaAppointmentStatus.REQUESTED, PrismaAppointmentStatus.CONFIRMED, PrismaAppointmentStatus.RESCHEDULED] },
        },
      }),
      this.queryByBucket(filter, bucket),
      this.queryPeakHours(filter),
      this.queryPeakDays(filter),
    ]);

    const countFor = (status: PrismaAppointmentStatus): number =>
      statusCounts.find((row) => row.status === status)?._count._all ?? 0;
    const completedCount = countFor(PrismaAppointmentStatus.COMPLETED);
    const cancelledCount = countFor(PrismaAppointmentStatus.CANCELLED);
    const noShowCount = countFor(PrismaAppointmentStatus.NO_SHOW);

    const rate = (count: number): number => (totalCount > 0 ? count / totalCount : 0);

    return {
      totalCount,
      completedCount,
      cancelledCount,
      noShowCount,
      upcomingCount,
      completionRate: rate(completedCount),
      cancellationRate: rate(cancelledCount),
      noShowRate: rate(noShowCount),
      byBucket,
      peakHours,
      peakDays,
      typeDistribution: {
        free: typeCounts.find((row) => row.consultationType === PrismaConsultationType.FREE)?._count._all ?? 0,
        paid: typeCounts.find((row) => row.consultationType === PrismaConsultationType.PAID)?._count._all ?? 0,
      },
    };
  }

  private buildWhereSql(filter: ReportFilter): Prisma.Sql {
    const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];
    if (filter.dateFrom) conditions.push(Prisma.sql`"scheduledAt" >= ${filter.dateFrom}`);
    if (filter.dateTo) conditions.push(Prisma.sql`"scheduledAt" <= ${filter.dateTo}`);
    if (filter.doctorId) conditions.push(Prisma.sql`"doctorId" = ${filter.doctorId}`);
    if (filter.consultationType) conditions.push(Prisma.sql`"consultationType" = ${filter.consultationType.toUpperCase()}::"ConsultationType"`);
    return Prisma.join(conditions, ' AND ');
  }

  private async queryByBucket(
    filter: ReportFilter,
    bucket: AnalyticsBucket,
  ): Promise<Array<{ bucket: string; count: number }>> {
    const trunc = BUCKET_TRUNC[bucket];
    const where = this.buildWhereSql(filter);
    // specialtyId requires the DoctorProfile join -- kept out of the raw
    // WHERE builder above to avoid a second join branch in every raw query;
    // applied as a subquery filter instead when present.
    const specialtyFilter = filter.specialtyId
      ? Prisma.sql`AND "doctorId" IN (SELECT id FROM "DoctorProfile" WHERE "specialtyId" = ${filter.specialtyId})`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT date_trunc(${trunc}, "scheduledAt") AS bucket, COUNT(*) AS count
      FROM "Appointment"
      WHERE ${where} ${specialtyFilter}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
    return rows.map((row) => ({ bucket: row.bucket.toISOString(), count: Number(row.count) }));
  }

  private async queryPeakHours(filter: ReportFilter): Promise<Array<{ hour: number; count: number }>> {
    const where = this.buildWhereSql(filter);
    const specialtyFilter = filter.specialtyId
      ? Prisma.sql`AND "doctorId" IN (SELECT id FROM "DoctorProfile" WHERE "specialtyId" = ${filter.specialtyId})`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "scheduledAt")::int AS hour, COUNT(*) AS count
      FROM "Appointment"
      WHERE ${where} ${specialtyFilter}
      GROUP BY hour
      ORDER BY hour ASC
    `;
    return rows.map((row) => ({ hour: row.hour, count: Number(row.count) }));
  }

  private async queryPeakDays(filter: ReportFilter): Promise<Array<{ dayOfWeek: number; count: number }>> {
    const where = this.buildWhereSql(filter);
    const specialtyFilter = filter.specialtyId
      ? Prisma.sql`AND "doctorId" IN (SELECT id FROM "DoctorProfile" WHERE "specialtyId" = ${filter.specialtyId})`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<{ dow: number; count: bigint }>>`
      SELECT EXTRACT(DOW FROM "scheduledAt")::int AS dow, COUNT(*) AS count
      FROM "Appointment"
      WHERE ${where} ${specialtyFilter}
      GROUP BY dow
      ORDER BY dow ASC
    `;
    return rows.map((row) => ({ dayOfWeek: row.dow, count: Number(row.count) }));
  }
}
