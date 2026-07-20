import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { Hospital } from '../../domain/entities/hospital.entity.js';
import type { HospitalRepository } from '../../domain/repositories/hospital.repository.js';

import { toDomainHospital } from './hospital.mapper.js';

@Injectable()
export class PrismaHospitalRepository implements HospitalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Hospital[]> {
    const rows = await this.prisma.hospital.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toDomainHospital);
  }

  async findById(id: string): Promise<Hospital | null> {
    const row = await this.prisma.hospital.findUnique({ where: { id } });
    return row ? toDomainHospital(row) : null;
  }

  async save(hospital: Hospital): Promise<void> {
    const data = {
      id: hospital.getId(),
      name: hospital.getName(),
      address: hospital.getAddress() ?? null,
    };

    await this.prisma.hospital.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
