import { Injectable } from '@nestjs/common';
import { VerificationStatus as PrismaVerificationStatus } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import type { VerificationCaseRepository } from '../../domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../domain/value-objects/doctor-professional-details.js';

import { toDomainVerificationCase } from './verification-case.mapper.js';
import { toPrismaVerificationStatus } from './verification-status.mapper.js';
import { toPrismaVerificationSubjectType } from './verification-subject-type.mapper.js';

const INCLUDE_DOCUMENTS = { documents: true } as const;

const PENDING_REVIEW_STATUSES: PrismaVerificationStatus[] = [
  PrismaVerificationStatus.SUBMITTED,
  PrismaVerificationStatus.UNDER_REVIEW,
  PrismaVerificationStatus.MORE_INFO_NEEDED,
];

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

  async findPendingReview(subjectType?: VerificationSubjectType, status?: VerificationStatus): Promise<VerificationCase[]> {
    const rows = await this.prisma.verificationCase.findMany({
      where: {
        status: status ? toPrismaVerificationStatus(status) : { in: PENDING_REVIEW_STATUSES },
        ...(subjectType ? { subjectType: toPrismaVerificationSubjectType(subjectType) } : {}),
      },
      include: INCLUDE_DOCUMENTS,
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map(toDomainVerificationCase);
  }

  async findAllBySubject(subjectType: VerificationSubjectType, subjectAccountId: string): Promise<VerificationCase[]> {
    const rows = await this.prisma.verificationCase.findMany({
      where: { subjectType: toPrismaVerificationSubjectType(subjectType), subjectAccountId },
      include: INCLUDE_DOCUMENTS,
      orderBy: { submittedAt: 'desc' },
    });
    return rows.map(toDomainVerificationCase);
  }

  // Document assets are attached only at creation — no use case in this
  // sprint's scope ever changes a case's documents after submission, so the
  // update branch only ever touches the decision fields.
  async save(verificationCase: VerificationCase): Promise<void> {
    const id = verificationCase.getId();
    const subjectDetails = verificationCase.getSubjectDetails();
    const professionalDetails =
      subjectDetails instanceof DoctorProfessionalDetails ? subjectDetails : undefined;

    await this.prisma.verificationCase.upsert({
      where: { id },
      create: {
        id,
        subjectAccountId: verificationCase.getSubjectAccountId(),
        subjectType: toPrismaVerificationSubjectType(verificationCase.getSubjectType()),
        licenseNumber: professionalDetails?.getLicenseNumber() ?? null,
        specialtyCode: professionalDetails?.getSpecialtyCode() ?? null,
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
