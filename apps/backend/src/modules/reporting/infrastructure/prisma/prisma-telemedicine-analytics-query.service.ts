import { Injectable } from '@nestjs/common';
import { Prisma, ConsultationState } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';
import type { TelemedicineAnalyticsQueryPort, TelemedicineAnalyticsResult } from '../../application/ports/telemedicine-analytics-query.port.js';

// Deliberately queries only ConsultationSession -- SessionConnectionLog is
// free-text (`note`), not structured event data, so join-delay/connection-
// success/missed-calls have no real data source here (see the port's own
// comment).
@Injectable()
export class PrismaTelemedicineAnalyticsQueryService implements TelemedicineAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(filter: ReportFilter): Promise<TelemedicineAnalyticsResult> {
    const appointmentFilter: Prisma.AppointmentWhereInput = {
      ...(filter.doctorId ? { doctorId: filter.doctorId } : {}),
      ...(filter.specialtyId ? { doctorProfile: { specialtyId: filter.specialtyId } } : {}),
    };
    const hasAppointmentFilter = Boolean(filter.doctorId || filter.specialtyId);

    const where: Prisma.ConsultationSessionWhereInput = {
      ...(filter.dateFrom || filter.dateTo
        ? { createdAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {}),
      ...(hasAppointmentFilter ? { appointment: appointmentFilter } : {}),
    };

    const [totalSessions, completedSessions, durationAgg] = await Promise.all([
      this.prisma.consultationSession.count({ where }),
      this.prisma.consultationSession.count({ where: { ...where, state: ConsultationState.COMPLETED } }),
      this.queryAverageDuration(filter, hasAppointmentFilter),
    ]);

    return { totalSessions, completedSessions, averageDurationMinutes: durationAgg };
  }

  // Server-side AVG via raw SQL, not fetch-all-then-reduce-in-JS.
  private async queryAverageDuration(filter: ReportFilter, hasAppointmentFilter: boolean): Promise<number | null> {
    const conditions: Prisma.Sql[] = [Prisma.sql`s."closedAt" IS NOT NULL`, Prisma.sql`s."startedAt" IS NOT NULL`];
    if (filter.dateFrom) conditions.push(Prisma.sql`s."createdAt" >= ${filter.dateFrom}`);
    if (filter.dateTo) conditions.push(Prisma.sql`s."createdAt" <= ${filter.dateTo}`);

    const joinSql = hasAppointmentFilter ? Prisma.sql`JOIN "Appointment" a ON a.id = s."appointmentId"` : Prisma.empty;
    if (filter.doctorId) conditions.push(Prisma.sql`a."doctorId" = ${filter.doctorId}`);
    if (filter.specialtyId) conditions.push(Prisma.sql`a."doctorId" IN (SELECT id FROM "DoctorProfile" WHERE "specialtyId" = ${filter.specialtyId})`);

    const rows = await this.prisma.$queryRaw<Array<{ avgMinutes: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (s."closedAt" - s."startedAt")) / 60) AS "avgMinutes"
      FROM "ConsultationSession" s
      ${joinSql}
      WHERE ${Prisma.join(conditions, ' AND ')}
    `;
    return rows[0]?.avgMinutes ?? null;
  }
}
