import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type {
  DoctorDirectoryFilter,
  DoctorDirectoryQueryPort,
  DoctorDirectoryResult,
} from '../../application/ports/doctor-directory-query.port.js';

// Onboarding Redesign (2026-07-21 proposal, §5/§9/§14 Stage O.1): the one
// Prisma-backed implementation of the read-only directory port -- joins
// DoctorProfile with its owning Account (same-database join, not a
// cross-module network call) purely to surface displayName on this specific
// list read, without adding a name field to the DoctorProfile aggregate
// itself. Stage O.9: the `specialty` free-text filter now matches against
// MedicalSpecialty.name via a relation filter, since DoctorProfile no longer
// carries its own free-text copy.
@Injectable()
export class PrismaDoctorDirectoryQueryService implements DoctorDirectoryQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(filter: DoctorDirectoryFilter): Promise<DoctorDirectoryResult> {
    const where: Prisma.DoctorProfileWhereInput = {
      ...(filter.hospitalId ? { hospitalId: filter.hospitalId } : {}),
      ...(filter.specialty ? { medicalSpecialty: { name: { contains: filter.specialty, mode: 'insensitive' } } } : {}),
      ...(filter.specialtyId ? { specialtyId: filter.specialtyId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        include: { account: { select: { displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: filter.limit,
        skip: filter.offset,
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return {
      total,
      entries: rows.map((row) => ({
        doctorProfileId: row.id,
        accountId: row.accountId,
        displayName: row.account.displayName,
        specialtyId: row.specialtyId,
        yearsOfExperience: row.yearsOfExperience ?? undefined,
        consultationFeeAmount: row.consultationFeeAmount ? Number(row.consultationFeeAmount) : undefined,
        hospitalId: row.hospitalId ?? undefined,
        avatarUrl: row.account.avatarUrl ?? undefined,
      })),
    };
  }
}
