import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ScheduleException } from '../../domain/entities/schedule-exception.entity.js';
import type { ScheduleExceptionRepository } from '../../domain/repositories/schedule-exception.repository.js';

import { toDomainScheduleException, toPersistedScheduleException } from './schedule-exception.mapper.js';

@Injectable()
export class PrismaScheduleExceptionRepository implements ScheduleExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ScheduleException | null> {
    const row = await this.prisma.scheduleException.findUnique({ where: { id } });
    return row ? toDomainScheduleException(row) : null;
  }

  async findByDoctorId(doctorId: string): Promise<ScheduleException[]> {
    const rows = await this.prisma.scheduleException.findMany({
      where: { doctorId },
      orderBy: { date: 'asc' },
    });
    return rows.map(toDomainScheduleException);
  }

  async findByDoctorIdsAndDates(doctorIds: string[], dates: string[]): Promise<ScheduleException[]> {
    if (doctorIds.length === 0 || dates.length === 0) {
      return [];
    }
    const rows = await this.prisma.scheduleException.findMany({
      where: {
        doctorId: { in: doctorIds },
        date: { in: dates.map((date) => new Date(`${date}T00:00:00.000Z`)) },
      },
    });
    return rows.map(toDomainScheduleException);
  }

  async save(exception: ScheduleException): Promise<void> {
    const data = toPersistedScheduleException(exception);
    await this.prisma.scheduleException.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.scheduleException.delete({ where: { id } });
  }
}
