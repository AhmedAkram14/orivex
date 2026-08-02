import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { DepartmentNotFoundError } from '../../domain/exceptions/department-not-found.error.js';
import { DoctorProfileAlreadyExistsError } from '../../domain/exceptions/doctor-profile-already-exists.error.js';
import { HospitalNotFoundError } from '../../domain/exceptions/hospital-not-found.error.js';
import { MedicalSpecialtyNotFoundError } from '../../domain/exceptions/medical-specialty-not-found.error.js';
import type { DoctorProfileRepository } from '../../domain/repositories/doctor-profile.repository.js';

import { toDomainDoctorProfile } from './doctor-profile.mapper.js';

const INCLUDE_CHILDREN = { publications: true, awards: true, workExperience: true } as const;

function isUniqueConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// A doctor-supplied hospitalId/specialtyId/departmentId that doesn't exist
// -- caught at the database FK rather than a second cross-module existence
// query (DoctorModule deliberately does not import AdministrationModule/
// ReferenceModule, which own Hospital/Department/MedicalSpecialty).
function isForeignKeyConstraintViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

// Prisma's P2003 error doesn't say which caller-supplied field failed in a
// structured way across every provider -- Postgres reports it in
// meta.field_name as the constraint name, e.g. "DoctorProfile_hospitalId_fkey
// (index)". Onboarding Redesign (2026-07-21 proposal, Stage O.3): now that
// three nullable FKs exist on this aggregate, this must be inspected
// explicitly rather than assumed (the pre-Stage-O.3 code only ever had one
// nullable FK, so guessing by presence happened to be safe then).
function violatedFieldName(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const fieldName = error.meta?.field_name;
  return typeof fieldName === 'string' ? fieldName : undefined;
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
            biography: profile.getBiography() ?? null,
            yearsOfExperience: profile.getYearsOfExperience() ?? null,
            languages: profile.getLanguages(),
            insuranceProviders: profile.getInsuranceProviders(),
            consultationFeeAmount: profile.getConsultationFeeAmount() ?? null,
            hospitalId: profile.getHospitalId() ?? null,
            specialtyId: profile.getSpecialtyId(),
            professionalRank: profile.getProfessionalRank() ?? null,
            licenseExpiryDate: profile.getLicenseExpiryDate() ?? null,
            departmentId: profile.getDepartmentId() ?? null,
          },
          update: {
            licenseNumber: profile.getLicenseNumber(),
            biography: profile.getBiography() ?? null,
            yearsOfExperience: profile.getYearsOfExperience() ?? null,
            languages: profile.getLanguages(),
            insuranceProviders: profile.getInsuranceProviders(),
            consultationFeeAmount: profile.getConsultationFeeAmount() ?? null,
            hospitalId: profile.getHospitalId() ?? null,
            specialtyId: profile.getSpecialtyId(),
            professionalRank: profile.getProfessionalRank() ?? null,
            licenseExpiryDate: profile.getLicenseExpiryDate() ?? null,
            departmentId: profile.getDepartmentId() ?? null,
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
        this.prisma.portfolioWorkExperience.deleteMany({ where: { doctorProfileId: id } }),
        this.prisma.portfolioWorkExperience.createMany({
          data: profile.getWorkExperience().map((w) => ({
            id: w.getId(),
            doctorProfileId: id,
            organizationName: w.getOrganizationName(),
            position: w.getPosition(),
            professionalRank: w.getProfessionalRank() ?? null,
            startDate: w.getStartDate(),
            endDate: w.getEndDate() ?? null,
            description: w.getDescription() ?? null,
          })),
        }),
      ]);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DoctorProfileAlreadyExistsError(profile.getAccountId());
      }
      if (isForeignKeyConstraintViolation(error)) {
        const fieldName = violatedFieldName(error);
        if (fieldName?.includes('hospitalId') && profile.getHospitalId()) {
          throw new HospitalNotFoundError(profile.getHospitalId() as string);
        }
        if (fieldName?.includes('specialtyId') && profile.getSpecialtyId()) {
          throw new MedicalSpecialtyNotFoundError(profile.getSpecialtyId() as string);
        }
        if (fieldName?.includes('departmentId') && profile.getDepartmentId()) {
          throw new DepartmentNotFoundError(profile.getDepartmentId() as string);
        }
      }
      throw error;
    }
  }
}
