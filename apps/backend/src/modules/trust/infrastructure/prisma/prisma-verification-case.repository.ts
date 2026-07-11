import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationCaseRepository } from '../../domain/repositories/verification-case.repository.js';

import { toDomainVerificationCase } from './verification-case.mapper.js';
import { toPrismaVerificationStatus } from './verification-status.mapper.js';

const INCLUDE_DOCUMENTS = { documents: true } as const;

@Injectable()
export class PrismaVerificationCaseRepository implements VerificationCaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<VerificationCase | null> {
    const row = await this.prisma.verificationCase.findUnique({
      where: { id },
      include: INCLUDE_DOCUMENTS,
    });
    return row ? toDomainVerificationCase(row) : null;
  }

  // Document assets are attached only at creation — no use case in this
  // sprint's scope ever changes a case's documents after submission, so the
  // update branch only ever touches the decision fields.
  async save(verificationCase: VerificationCase): Promise<void> {
    const id = verificationCase.getId();

    await this.prisma.verificationCase.upsert({
      where: { id },
      create: {
        id,
        doctorId: verificationCase.getDoctorId(),
        licenseNumber: verificationCase.getLicenseNumber(),
        specialtyCode: verificationCase.getSpecialtyCode(),
        status: toPrismaVerificationStatus(verificationCase.getStatus()),
        reason: verificationCase.getReason() ?? null,
        submittedAt: verificationCase.getSubmittedAt(),
        decidedAt: verificationCase.getDecidedAt() ?? null,
        documents: {
          create: verificationCase.getDocumentAssetIds().map((mediaAssetId) => ({ mediaAssetId })),
        },
      },
      update: {
        status: toPrismaVerificationStatus(verificationCase.getStatus()),
        reason: verificationCase.getReason() ?? null,
        decidedAt: verificationCase.getDecidedAt() ?? null,
      },
    });
  }
}
