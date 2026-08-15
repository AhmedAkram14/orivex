import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type {
  DoctorSearchParams,
  DoctorSearchResult,
  SearchDoctorsPort,
} from '../../application/ports/search-doctors.port.js';

// Mirrors PrismaDoctorDirectoryQueryService's own join style (DoctorProfile
// -> Account for displayName, DoctorProfile -> MedicalSpecialty for the
// real specialty name) -- never a fetch-then-filter-in-JS, every scope
// decision is a real Prisma WHERE clause, bounded by `take`.
@Injectable()
export class PrismaSearchDoctorsQueryService implements SearchDoctorsPort {
  constructor(private readonly prisma: PrismaService) {}

  // Public doctor directory (Patient / Nurse / Receptionist / HospitalAdmin
  // callers): OR-matches display name, specialty name, or hospital name --
  // already-public data, same as GET /doctors.
  async searchPublic({ query, limit }: DoctorSearchParams): Promise<DoctorSearchResult> {
    const where: Prisma.DoctorProfileWhereInput = {
      OR: [
        { account: { displayName: { contains: query, mode: 'insensitive' } } },
        { medicalSpecialty: { name: { contains: query, mode: 'insensitive' } } },
        { hospital: { name: { contains: query, mode: 'insensitive' } } },
      ],
    };
    return this.run(where, limit);
  }

  // SuperAdmin: platform-wide, Account.displayName only -- mirrors
  // /admin/accounts' existing unrestricted, name-only lookup.
  async searchAdmin({ query, limit }: DoctorSearchParams): Promise<DoctorSearchResult> {
    const where: Prisma.DoctorProfileWhereInput = {
      account: { displayName: { contains: query, mode: 'insensitive' } },
    };
    return this.run(where, limit);
  }

  private async run(where: Prisma.DoctorProfileWhereInput, limit: number): Promise<DoctorSearchResult> {
    const [rows, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        select: {
          id: true,
          account: { select: { displayName: true } },
          medicalSpecialty: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return {
      total,
      entries: rows.map((row) => ({
        doctorProfileId: row.id,
        displayName: row.account.displayName,
        specialtyName: row.medicalSpecialty?.name ?? null,
      })),
    };
  }
}
