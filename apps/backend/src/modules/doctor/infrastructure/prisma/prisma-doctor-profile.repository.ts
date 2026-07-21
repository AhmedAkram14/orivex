import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { DoctorProfileAlreadyExistsError } from '../../domain/exceptions/doctor-profile-already-exists.error.js';
import { HospitalNotFoundError } from '../../domain/exceptions/hospital-not-found.error.js';
import type { DoctorProfileRepository } from '../../domain/repositories/doctor-profile.repository.js';

import { toDomainDoctorProfile } from './doctor-profile.mapper.js';

const INCLUDE_CHILDREN = { publications: true, awards: true } as const;

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// A doctor-supplied hospitalId that doesn't exist -- caught at the database
// FK rather than a second cross-module existence query (DoctorModule
// deliberately does not import AdministrationModule, which owns Hospital).
function isForeignKeyConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

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

  // RegisterDoctorProfileUseCase's own check-then-act uniqueness guard is a
  // fast-fail UX nicety, not the actual guarantee -- two concurrent
  // registrations for the same account can both pass that check before
  // either saves. DoctorProfile.accountId is DB-unique, so a genuine race
  // still fails safely here; catching P2002 and translating it to the same
  // domain-level "already exists" outcome closes the gap this would
  // otherwise leave as an unmapped 500.
  async save(profile: DoctorProfile): Promise<void> {
    const id = profile.getId();

    try {
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
            hospitalId: profile.getHospitalId() ?? null,
          },
          update: {
            licenseNumber: profile.getLicenseNumber(),
            specialty: profile.getSpecialty(),
            biography: profile.getBiography() ?? null,
            yearsOfExperience: profile.getYearsOfExperience() ?? null,
            languages: profile.getLanguages(),
            consultationFeeAmount: profile.getConsultationFeeAmount() ?? null,
            hospitalId: profile.getHospitalId() ?? null,
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
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DoctorProfileAlreadyExistsError(profile.getAccountId());
      }
      if (isForeignKeyConstraintViolation(error) && profile.getHospitalId()) {
        throw new HospitalNotFoundError(profile.getHospitalId() as string);
      }
      throw error;
    }
  }
}
