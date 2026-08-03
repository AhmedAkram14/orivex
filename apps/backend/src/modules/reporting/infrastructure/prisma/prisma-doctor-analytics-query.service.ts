import { Injectable } from '@nestjs/common';
import { Prisma, AppointmentStatus as PrismaAppointmentStatus, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ReportFilter } from '../../application/dto/report-filter.js';
import type { DoctorActivityRow, DoctorAnalyticsQueryPort } from '../../application/ports/doctor-analytics-query.port.js';

// Per-doctor activity across Appointment/ConsultationSession/PaymentTransaction
// -- every metric is a single batched groupBy/raw query across every doctor
// in scope (never one query per doctor; see class comment on the appointment
// service for why this queries Prisma directly rather than through the
// owning modules' write-repos).
@Injectable()
export class PrismaDoctorAnalyticsQueryService implements DoctorAnalyticsQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getActivity(filter: ReportFilter): Promise<DoctorActivityRow[]> {
    const doctorProfiles = await this.prisma.doctorProfile.findMany({
      where: {
        ...(filter.doctorId ? { id: filter.doctorId } : {}),
        ...(filter.specialtyId ? { specialtyId: filter.specialtyId } : {}),
      },
      select: { id: true, specialtyId: true, account: { select: { displayName: true } } },
    });
    if (doctorProfiles.length === 0) {
      return [];
    }
    const doctorIds = doctorProfiles.map((profile) => profile.id);

    const appointmentWhere: Prisma.AppointmentWhereInput = {
      doctorId: { in: doctorIds },
      ...(filter.dateFrom || filter.dateTo
        ? { scheduledAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
        : {}),
    };

    const [statusRows, patientRows, revenueRows, durationRows] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['doctorId', 'status'], where: appointmentWhere, _count: { _all: true } }),
      this.prisma.appointment.groupBy({ by: ['doctorId', 'patientId'], where: appointmentWhere }),
      this.prisma.paymentTransaction.groupBy({
        by: ['doctorId'],
        where: {
          doctorId: { in: doctorIds },
          status: { in: [PrismaPaymentStatus.SUCCEEDED, PrismaPaymentStatus.SETTLED] },
          ...(filter.dateFrom || filter.dateTo
            ? { createdAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
            : {}),
        },
        _sum: { amount: true },
      }),
      this.queryAverageDuration(doctorIds, filter),
    ]);

    const patientCountByDoctor = new Map<string, number>();
    for (const row of patientRows) {
      patientCountByDoctor.set(row.doctorId, (patientCountByDoctor.get(row.doctorId) ?? 0) + 1);
    }
    const revenueByDoctor = new Map(revenueRows.map((row) => [row.doctorId, Number(row._sum.amount ?? 0)]));

    return doctorProfiles.map((profile) => {
      const rowsForDoctor = statusRows.filter((row) => row.doctorId === profile.id);
      const countFor = (status: PrismaAppointmentStatus): number =>
        rowsForDoctor.find((row) => row.status === status)?._count._all ?? 0;
      const upcomingStatuses: PrismaAppointmentStatus[] = [
        PrismaAppointmentStatus.REQUESTED,
        PrismaAppointmentStatus.CONFIRMED,
        PrismaAppointmentStatus.RESCHEDULED,
      ];
      const upcomingAppointments = rowsForDoctor
        .filter((row) => upcomingStatuses.includes(row.status))
        .reduce((sum, row) => sum + row._count._all, 0);
      const totalAppointments = rowsForDoctor.reduce((sum, row) => sum + row._count._all, 0);

      return {
        doctorId: profile.id,
        displayName: profile.account.displayName,
        specialtyId: profile.specialtyId,
        completedConsultations: countFor(PrismaAppointmentStatus.COMPLETED),
        // "Upcoming" is inherently forward-looking regardless of the date
        // filter's upper bound -- approximated here from status only
        // (not re-checked against `now`) since this is a batched query
        // across every doctor; acceptable because REQUESTED/CONFIRMED/
        // RESCHEDULED appointments are never in the past in normal
        // operation (CloseConsultationUseCase/RescheduleOrCancel always
        // transition past appointments out of these statuses).
        upcomingAppointments,
        cancelledCount: countFor(PrismaAppointmentStatus.CANCELLED),
        totalAppointments,
        averageSessionDurationMinutes: durationRows.get(profile.id) ?? null,
        revenueGenerated: revenueByDoctor.get(profile.id) ?? 0,
        patientCount: patientCountByDoctor.get(profile.id) ?? 0,
      };
    });
  }

  private async queryAverageDuration(doctorIds: string[], filter: ReportFilter): Promise<Map<string, number>> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`a."doctorId" IN (${Prisma.join(doctorIds)})`,
      Prisma.sql`s."closedAt" IS NOT NULL`,
      Prisma.sql`s."startedAt" IS NOT NULL`,
    ];
    if (filter.dateFrom) conditions.push(Prisma.sql`a."scheduledAt" >= ${filter.dateFrom}`);
    if (filter.dateTo) conditions.push(Prisma.sql`a."scheduledAt" <= ${filter.dateTo}`);

    const rows = await this.prisma.$queryRaw<Array<{ doctorId: string; avgMinutes: number }>>`
      SELECT a."doctorId" AS "doctorId", AVG(EXTRACT(EPOCH FROM (s."closedAt" - s."startedAt")) / 60) AS "avgMinutes"
      FROM "ConsultationSession" s
      JOIN "Appointment" a ON a.id = s."appointmentId"
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY a."doctorId"
    `;
    return new Map(rows.map((row) => [row.doctorId, Number(row.avgMinutes)]));
  }
}
