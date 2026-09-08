import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { LabRequest } from '../../domain/entities/lab-request.entity.js';
import type { LabRequestRepository } from '../../domain/repositories/lab-request.repository.js';

import { toDomainLabRequest } from './lab-request.mapper.js';
import { toPrismaLabRequestStatus } from './lab-request-status.mapper.js';

@Injectable()
export class PrismaLabRequestRepository implements LabRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<LabRequest | null> {
    const row = await this.prisma.labRequest.findUnique({ where: { id } });
    return row ? toDomainLabRequest(row) : null;
  }

  async findByConsultationSessionId(consultationSessionId: string): Promise<LabRequest[]> {
    const rows = await this.prisma.labRequest.findMany({
      where: { consultationSessionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomainLabRequest);
  }

  async save(labRequest: LabRequest): Promise<void> {
    await this.prisma.labRequest.create({
      data: {
        id: labRequest.getId(),
        consultationSessionId: labRequest.getConsultationSessionId(),
        authoringDoctorId: labRequest.getAuthoringDoctorId(),
        testName: labRequest.getTestName(),
        clinicalReason: labRequest.getClinicalReason() ?? null,
        instructions: labRequest.getInstructions() ?? null,
        status: toPrismaLabRequestStatus(labRequest.getStatus()),
        createdAt: labRequest.getCreatedAt(),
        updatedAt: labRequest.getUpdatedAt(),
      },
    });
  }

  async update(labRequest: LabRequest): Promise<void> {
    await this.prisma.labRequest.update({
      where: { id: labRequest.getId() },
      data: {
        status: toPrismaLabRequestStatus(labRequest.getStatus()),
        updatedAt: labRequest.getUpdatedAt(),
      },
    });
  }
}
