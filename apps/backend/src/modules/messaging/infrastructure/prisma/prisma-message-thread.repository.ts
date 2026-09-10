import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { MessageThread } from '../../domain/entities/message-thread.entity.js';
import type { MessageThreadRepository } from '../../domain/repositories/message-thread.repository.js';

import { toDomainMessageThread } from './message-thread.mapper.js';

@Injectable()
export class PrismaMessageThreadRepository implements MessageThreadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MessageThread | null> {
    const row = await this.prisma.messageThread.findUnique({ where: { id } });
    return row ? toDomainMessageThread(row) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<MessageThread | null> {
    const row = await this.prisma.messageThread.findUnique({ where: { appointmentId } });
    return row ? toDomainMessageThread(row) : null;
  }

  async findByPatientId(patientId: string): Promise<MessageThread[]> {
    const rows = await this.prisma.messageThread.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDomainMessageThread);
  }

  async findByDoctorId(doctorId: string): Promise<MessageThread[]> {
    const rows = await this.prisma.messageThread.findMany({ where: { doctorId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDomainMessageThread);
  }

  async save(thread: MessageThread): Promise<void> {
    await this.prisma.messageThread.create({
      data: {
        id: thread.getId(),
        appointmentId: thread.getAppointmentId(),
        patientId: thread.getPatientId(),
        doctorId: thread.getDoctorId(),
        createdAt: thread.getCreatedAt(),
      },
    });
  }
}
