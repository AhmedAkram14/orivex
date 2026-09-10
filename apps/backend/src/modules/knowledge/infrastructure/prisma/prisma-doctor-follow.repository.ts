import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { DoctorFollow } from '../../domain/entities/doctor-follow.entity.js';
import type { DoctorFollowRepository } from '../../domain/repositories/doctor-follow.repository.js';

import { toDomainDoctorFollow } from './doctor-follow.mapper.js';

@Injectable()
export class PrismaDoctorFollowRepository implements DoctorFollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatientAndDoctor(patientId: string, doctorId: string): Promise<DoctorFollow | null> {
    const row = await this.prisma.doctorFollow.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
    return row ? toDomainDoctorFollow(row) : null;
  }

  async listByPatientId(patientId: string): Promise<DoctorFollow[]> {
    const rows = await this.prisma.doctorFollow.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDomainDoctorFollow);
  }

  async save(follow: DoctorFollow): Promise<void> {
    await this.prisma.doctorFollow.create({
      data: {
        id: follow.getId(),
        patientId: follow.getPatientId(),
        doctorId: follow.getDoctorId(),
        createdAt: follow.getCreatedAt(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.doctorFollow.delete({ where: { id } });
  }
}
