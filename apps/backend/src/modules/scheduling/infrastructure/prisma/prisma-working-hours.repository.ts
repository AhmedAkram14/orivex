import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { WorkingHoursDay } from '../../domain/entities/working-hours-day.entity.js';
import type { WorkingHoursRepository } from '../../domain/repositories/working-hours.repository.js';

import { toDomainWorkingHoursDay, toPersistedWorkingHoursDay } from './working-hours.mapper.js';

@Injectable()
export class PrismaWorkingHoursRepository implements WorkingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDoctorId(doctorId: string): Promise<WorkingHoursDay[]> {
    const rows = await this.prisma.workingHoursDay.findMany({ where: { doctorId } });
    return rows.map(toDomainWorkingHoursDay);
  }

  async findByDoctorIds(doctorIds: string[]): Promise<Map<string, WorkingHoursDay[]>> {
    if (doctorIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.workingHoursDay.findMany({ where: { doctorId: { in: doctorIds } } });
    const result = new Map<string, WorkingHoursDay[]>();
    for (const row of rows) {
      const day = toDomainWorkingHoursDay(row);
      const existing = result.get(row.doctorId) ?? [];
      existing.push(day);
      result.set(row.doctorId, existing);
    }
    return result;
  }

  // Full replace-all-7 in a single transaction so a partial write never
  // leaves fewer/more than 7 rows persisted for the doctor.
  async replaceAllForDoctor(doctorId: string, days: WorkingHoursDay[]): Promise<WorkingHoursDay[]> {
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.workingHoursDay.deleteMany({ where: { doctorId } });
      await tx.workingHoursDay.createMany({ data: days.map((day) => toPersistedWorkingHoursDay(day)) });
      return tx.workingHoursDay.findMany({ where: { doctorId } });
    });

    return rows.map(toDomainWorkingHoursDay);
  }
}
