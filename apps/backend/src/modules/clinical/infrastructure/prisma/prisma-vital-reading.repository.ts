import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { VitalReading } from '../../domain/entities/vital-reading.entity.js';
import type { VitalReadingRepository } from '../../domain/repositories/vital-reading.repository.js';

import { toDomainVitalReading, toPersistedVitalReading } from './vital-reading.mapper.js';

@Injectable()
export class PrismaVitalReadingRepository implements VitalReadingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatientId(patientId: string): Promise<VitalReading[]> {
    const rows = await this.prisma.vitalReading.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'asc' },
    });
    return rows.map(toDomainVitalReading);
  }

  async save(vitalReading: VitalReading): Promise<void> {
    const data = toPersistedVitalReading(vitalReading);
    await this.prisma.vitalReading.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
