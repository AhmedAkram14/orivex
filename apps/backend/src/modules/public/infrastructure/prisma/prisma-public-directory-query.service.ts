import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { ProfessionalRank } from '../../../doctor/domain/enums/professional-rank.enum.js';
import type {
  PublicDirectoryQueryPort,
  PublicDoctorFilter,
  PublicDoctorResult,
  PublicSpecialtyCount,
} from '../../application/ports/public-directory-query.port.js';

// Public Landing Page (2026-07-29): the one Prisma-backed implementation of
// PublicDirectoryQueryPort. Every query here is scoped to
// `account.role = 'doctor'` -- a DoctorProfile row exists from the moment a
// pending application is submitted (RegisterDoctorProfileUseCase), long
// before an admin approves it and PromoteDoctorRoleOnVerificationHandler
// promotes the account's role, so filtering on the *role* (not just profile
// existence) is what keeps an unverified applicant off the public landing
// page.
@Injectable()
export class PrismaPublicDirectoryQueryService implements PublicDirectoryQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async countDoctorsBySpecialty(): Promise<PublicSpecialtyCount[]> {
    const rows = await this.prisma.doctorProfile.groupBy({
      by: ['specialtyId'],
      where: { account: { role: AccountRole.Doctor } },
      _count: { _all: true },
    });

    return rows.map((row) => ({ specialtyId: row.specialtyId, doctorCount: row._count._all }));
  }

  async searchDoctors(filter: PublicDoctorFilter): Promise<PublicDoctorResult> {
    const where: Prisma.DoctorProfileWhereInput = {
      account: { role: AccountRole.Doctor },
      ...(filter.specialtyId ? { specialtyId: filter.specialtyId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        include: {
          account: { select: { displayName: true } },
          medicalSpecialty: { select: { name: true } },
          hospital: { select: { name: true } },
        },
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
        fullName: row.account.displayName,
        professionalRank: (row.professionalRank as ProfessionalRank | null) ?? undefined,
        specialtyId: row.specialtyId,
        specialtyName: row.medicalSpecialty.name,
        hospitalId: row.hospitalId ?? undefined,
        hospitalName: row.hospital?.name ?? undefined,
        yearsOfExperience: row.yearsOfExperience ?? undefined,
        consultationFeeAmount: row.consultationFeeAmount ? Number(row.consultationFeeAmount) : undefined,
      })),
    };
  }
}
