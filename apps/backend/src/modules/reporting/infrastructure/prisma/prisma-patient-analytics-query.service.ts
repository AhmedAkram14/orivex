import { Injectable } from '@nestjs/common';
import { Prisma, VerificationStatus as PrismaVerificationStatus, VerificationSubjectType } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';
import { resolveCurrentWindow } from '../../application/dto/previous-period.js';
import type { PatientAnalyticsQueryPort, PatientAnalyticsResult } from '../../application/ports/patient-analytics-query.port.js';

const AGE_BUCKET_SQL = Prisma.sql`
  CASE
    WHEN a."dateOfBirth" IS NULL THEN 'unknown'
    WHEN EXTRACT(YEAR FROM age(a."dateOfBirth")) < 18 THEN '0-17'
    WHEN EXTRACT(YEAR FROM age(a."dateOfBirth")) < 30 THEN '18-29'
    WHEN EXTRACT(YEAR FROM age(a."dateOfBirth")) < 45 THEN '30-44'
    WHEN EXTRACT(YEAR FROM age(a."dateOfBirth")) < 60 THEN '45-59'
    ELSE '60+'
  END
`;

@Injectable()
export class PrismaPatientAnalyticsQueryService implements PatientAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(filter: ReportFilter): Promise<PatientAnalyticsResult> {
    const activeWindow = resolveCurrentWindow(filter.dateFrom, filter.dateTo);
    const patientDateFilter =
      filter.dateFrom || filter.dateTo
        ? { createdAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {};

    const [newPatients, verifiedCases, genderRows, ageRows, returningPatients, activePatients, mostActive] = await Promise.all([
      this.prisma.patientProfile.count({ where: patientDateFilter }),
      this.prisma.verificationCase.groupBy({
        by: ['subjectAccountId'],
        where: { subjectType: VerificationSubjectType.PATIENT, status: PrismaVerificationStatus.APPROVED },
      }),
      this.prisma.account.groupBy({ by: ['gender'], where: { role: 'patient', ...patientDateFilter }, _count: { _all: true } }),
      this.queryAgeDistribution(patientDateFilter),
      this.countPatientsWithMinAppointments(filter, 2),
      this.countDistinctAppointmentPatients(activeWindow.from, activeWindow.to),
      this.queryMostActivePatients(filter),
    ]);

    const genderDistribution: Record<string, number> = {};
    for (const row of genderRows) {
      genderDistribution[row.gender ?? 'unknown'] = row._count._all;
    }

    return {
      newPatients,
      returningPatients,
      verifiedPatients: verifiedCases.length,
      activePatients,
      genderDistribution,
      ageDistribution: ageRows,
      mostActivePatients: mostActive,
    };
  }

  private async queryAgeDistribution(
    patientDateFilter: Prisma.PatientProfileWhereInput,
  ): Promise<Array<{ bucket: string; count: number }>> {
    const dateConditions: Prisma.Sql[] = [];
    const dateWhere = patientDateFilter.createdAt as { gte?: Date; lte?: Date } | undefined;
    if (dateWhere?.gte) dateConditions.push(Prisma.sql`p."createdAt" >= ${dateWhere.gte}`);
    if (dateWhere?.lte) dateConditions.push(Prisma.sql`p."createdAt" <= ${dateWhere.lte}`);
    const whereSql = dateConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(dateConditions, ' AND ')}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Array<{ bucket: string; count: bigint }>>`
      SELECT ${AGE_BUCKET_SQL} AS bucket, COUNT(*) AS count
      FROM "PatientProfile" p
      JOIN "Account" a ON a.id = p."accountId"
      ${whereSql}
      GROUP BY bucket
    `;
    return rows.map((row) => ({ bucket: row.bucket, count: Number(row.count) }));
  }

  private async countPatientsWithMinAppointments(filter: ReportFilter, minCount: number): Promise<number> {
    const where = this.buildAppointmentWhere(filter);
    const rows = await this.prisma.appointment.groupBy({ by: ['patientId'], where, _count: { _all: true } });
    return rows.filter((row) => row._count._all >= minCount).length;
  }

  private async countDistinctAppointmentPatients(from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.appointment.groupBy({
      by: ['patientId'],
      where: { scheduledAt: { gte: from, lte: to } },
    });
    return rows.length;
  }

  private async queryMostActivePatients(
    filter: ReportFilter,
  ): Promise<Array<{ patientId: string; displayName: string; appointmentCount: number }>> {
    const where = this.buildAppointmentWhere(filter);
    const rows = await this.prisma.appointment.groupBy({
      by: ['patientId'],
      where,
      _count: { _all: true },
      orderBy: { _count: { patientId: 'desc' } },
      take: 10,
    });
    if (rows.length === 0) {
      return [];
    }
    const profiles = await this.prisma.patientProfile.findMany({
      where: { id: { in: rows.map((row) => row.patientId) } },
      select: { id: true, account: { select: { displayName: true } } },
    });
    const nameById = new Map(profiles.map((profile) => [profile.id, profile.account.displayName]));
    return rows.map((row) => ({
      patientId: row.patientId,
      displayName: nameById.get(row.patientId) ?? 'Unknown',
      appointmentCount: row._count._all,
    }));
  }

  private buildAppointmentWhere(filter: ReportFilter): Prisma.AppointmentWhereInput {
    return {
      ...(filter.dateFrom || filter.dateTo
        ? { scheduledAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {}),
      ...(filter.doctorId ? { doctorId: filter.doctorId } : {}),
      ...(filter.specialtyId ? { doctorProfile: { specialtyId: filter.specialtyId } } : {}),
    };
  }
}
