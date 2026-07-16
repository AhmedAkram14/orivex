import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';
import { ConsultationDomainError } from '../../domain/exceptions/consultation-domain.error.js';
import type { AppointmentRepository } from '../../domain/repositories/appointment.repository.js';

import { toDomainAppointment } from './appointment.mapper.js';
import { toPrismaAppointmentStatus } from './appointment-status.mapper.js';
import { toPrismaConsultationType } from './consultation-type.mapper.js';

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

  // Optimistic locking, mirroring AvailabilityWindow's repository: updates
  // are conditioned on the version the caller loaded; a 0-row result means
  // another writer already moved the row on.
  async save(appointment: Appointment): Promise<void> {
    const data = {
      patientId: appointment.getPatientId(),
      doctorId: appointment.getDoctorId(),
      availabilityWindowId: appointment.getAvailabilityWindowId(),
      consultationType: toPrismaConsultationType(appointment.getConsultationType()),
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
