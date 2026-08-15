import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type {
  AppointmentSearchResult,
  SearchAppointmentsPort,
} from '../../application/ports/search-appointments.port.js';

// Every query here is hard-scoped by patientId/doctorId in the WHERE
// clause itself (backed by Appointment's real @@index([patientId]) /
// @@index([doctorId]) / @@index([patientId, scheduledAt]) /
// @@index([doctorId, scheduledAt])) -- never a caller-wide fetch filtered
// in application code. Only the counterpart's nested
// account.displayName is selected off the joined profile, so no
// PatientProfile clinical field is ever touched here either.
@Injectable()
export class PrismaSearchAppointmentsQueryService implements SearchAppointmentsPort {
  constructor(private readonly prisma: PrismaService) {}

  // Patient caller: own appointments only, matched against the doctor's
  // (the counterpart's) display name.
  async searchForPatient({
    patientProfileId,
    query,
    limit,
  }: {
    patientProfileId: string;
    query: string;
    limit: number;
  }): Promise<AppointmentSearchResult> {
    const where: Prisma.AppointmentWhereInput = {
      patientId: patientProfileId,
      doctorProfile: { account: { displayName: { contains: query, mode: 'insensitive' } } },
    };

    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          doctorProfile: { select: { account: { select: { displayName: true } } } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      total,
      entries: rows.map((row) => ({
        appointmentId: row.id,
        counterpartName: row.doctorProfile.account.displayName,
        scheduledAt: row.scheduledAt,
        status: row.status,
      })),
    };
  }

  // Doctor caller: own appointments only, matched against the patient's
  // (the counterpart's) display name.
  async searchForDoctor({
    doctorProfileId,
    query,
    limit,
  }: {
    doctorProfileId: string;
    query: string;
    limit: number;
  }): Promise<AppointmentSearchResult> {
    const where: Prisma.AppointmentWhereInput = {
      doctorId: doctorProfileId,
      patientProfile: { account: { displayName: { contains: query, mode: 'insensitive' } } },
    };

    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          patientProfile: { select: { account: { select: { displayName: true } } } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      total,
      entries: rows.map((row) => ({
        appointmentId: row.id,
        counterpartName: row.patientProfile.account.displayName,
        scheduledAt: row.scheduledAt,
        status: row.status,
      })),
    };
  }
}
