import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import type { AppointmentStatus } from '../../domain/enums/appointment-status.enum.js';
import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';

import { toDomainAppointment } from './appointment.mapper.js';
import { toDomainAppointmentStatus, toPrismaAppointmentStatus } from './appointment-status.mapper.js';
import { toPersistedConsultationPricing } from './consultation-pricing.mapper.js';

@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Appointment | null> {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    return row ? toDomainAppointment(row) : null;
  }

  async findByPatientId(patientId: string): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
    });
    return rows.map(toDomainAppointment);
  }

  async findByPatientIdPage(patientId: string, skip: number, take: number): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take,
    });
    return rows.map(toDomainAppointment);
  }

  async countByPatientId(patientId: string): Promise<number> {
    return this.prisma.appointment.count({ where: { patientId } });
  }

  async findByDoctorId(doctorId: string): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map(toDomainAppointment);
  }

  async findByDoctorIdForDateRange(doctorId: string, start: Date, end: Date): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: { doctorId, scheduledAt: { gte: start, lt: end } },
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map(toDomainAppointment);
  }

  async countByDoctorIds(doctorIds: string[], statuses: AppointmentStatus[]): Promise<Map<string, number>> {
    if (doctorIds.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.appointment.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: doctorIds }, status: { in: statuses.map(toPrismaAppointmentStatus) } },
      _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.doctorId, group._count._all]));
  }

  async countByStatusForDoctor(doctorId: string): Promise<Partial<Record<AppointmentStatus, number>>> {
    const groups = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: { doctorId },
      _count: { _all: true },
    });
    const result: Partial<Record<AppointmentStatus, number>> = {};
    for (const group of groups) {
      result[toDomainAppointmentStatus(group.status)] = group._count._all;
    }
    return result;
  }

  async findConfirmedPastJoinWindowMissed(cutoff: Date): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        scheduledAt: { lt: cutoff },
        consultationSession: { state: 'WAITING_ROOM' },
      },
    });
    return rows.map(toDomainAppointment);
  }

  // Optimistic locking, mirroring AvailabilityWindow's repository: updates
  // are conditioned on the version the caller loaded; a 0-row result means
  // another writer already moved the row on.
  async save(appointment: Appointment): Promise<void> {
    const data = {
      patientId: appointment.getPatientId(),
      doctorId: appointment.getDoctorId(),
      availabilityWindowId: appointment.getAvailabilityWindowId(),
      ...toPersistedConsultationPricing(appointment.getPricing()),
      status: toPrismaAppointmentStatus(appointment.getStatus()),
      scheduledAt: appointment.getScheduledAt(),
      reasonForVisit: appointment.getReasonForVisit() ?? null,
      rescheduledFromId: appointment.getRescheduledFromId() ?? null,
    };

    const existing = await this.prisma.appointment.findUnique({ where: { id: appointment.getId() }, select: { id: true } });

    if (!existing) {
      await this.prisma.appointment.create({
        data: { id: appointment.getId(), ...data, version: appointment.getVersion() },
      });
      return;
    }

    const result = await this.prisma.appointment.updateMany({
      where: { id: appointment.getId(), version: appointment.getVersion() },
      data: { ...data, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw new ConsultationDomainError(`Appointment "${appointment.getId()}" was modified concurrently; reload and retry.`);
    }
  }
}
