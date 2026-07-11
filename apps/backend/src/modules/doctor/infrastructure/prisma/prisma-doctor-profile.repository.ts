import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../domain/repositories/doctor-profile.repository.js';

import { toDomainDoctorProfile } from './doctor-profile.mapper.js';

const INCLUDE_CHILDREN = { publications: true, awards: true } as const;

@Injectable()
export class PrismaDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<DoctorProfile | null> {
    const row = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: INCLUDE_CHILDREN,
    });
    return row ? toDomainDoctorProfile(row) : null;
  }

  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    const row = await this.prisma.doctorProfile.findUnique({
      where: { accountId },
      include: INCLUDE_CHILDREN,
    });
    return row ? toDomainDoctorProfile(row) : null;
  }

  async save(profile: DoctorProfile): Promise<void> {
    const id = profile.getId();

    await this.prisma.$transaction([
      this.prisma.doctorProfile.upsert({
        where: { id },
        create: {
          id,
          accountId: profile.getAccountId(),
          licenseNumber: profile.getLicenseNumber(),
          specialty: profile.getSpecialty(),
          biography: profile.getBiography() ?? null,
          yearsOfExperience: profile.getYearsOfExperience() ?? null,
          languages: profile.getLanguages(),
          consultationFeeAmount: profile.getConsultationFeeAmount() ?? null,
        },
        update: {
          licenseNumber: profile.getLicenseNumber(),
          specialty: profile.getSpecialty(),
          biography: profile.getBiography() ?? null,
          yearsOfExperience: profile.getYearsOfExperience() ?? null,
          languages: profile.getLanguages(),
          consultationFeeAmount: profile.getConsultationFeeAmount() ?? null,
        },
      }),
      this.prisma.portfolioPublication.deleteMany({ where: { doctorProfileId: id } }),
      this.prisma.portfolioPublication.createMany({
        data: profile.getPublications().map((p) => ({
          id: p.getId(),
          doctorProfileId: id,
          title: p.getTitle(),
          reference: p.getReference() ?? null,
          publishedAt: p.getPublishedAt() ?? null,
        })),
      }),
      this.prisma.portfolioAward.deleteMany({ where: { doctorProfileId: id } }),
      this.prisma.portfolioAward.createMany({
        data: profile.getAwards().map((a) => ({
          id: a.getId(),
          doctorProfileId: id,
          title: a.getTitle(),
          issuingBody: a.getIssuingBody() ?? null,
          awardedAt: a.getAwardedAt() ?? null,
        })),
      }),
    ]);
  }
}
