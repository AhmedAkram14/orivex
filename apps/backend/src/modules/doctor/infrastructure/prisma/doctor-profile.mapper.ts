import type {
  DoctorProfile as PrismaDoctorProfileRow,
  PortfolioAward as PrismaPortfolioAwardRow,
  PortfolioPublication as PrismaPortfolioPublicationRow,
  PortfolioWorkExperience as PrismaPortfolioWorkExperienceRow,
} from '@prisma/client';

import { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { PortfolioAward } from '../../domain/entities/portfolio-award.entity.js';
import { PortfolioPublication } from '../../domain/entities/portfolio-publication.entity.js';
import { PortfolioWorkExperience } from '../../domain/entities/portfolio-work-experience.entity.js';
import type { ProfessionalRank } from '../../domain/enums/professional-rank.enum.js';

export type PersistedDoctorProfileRow = PrismaDoctorProfileRow & {
  publications: PrismaPortfolioPublicationRow[];
  awards: PrismaPortfolioAwardRow[];
  workExperience: PrismaPortfolioWorkExperienceRow[];
};

export function toDomainDoctorProfile(row: PersistedDoctorProfileRow): DoctorProfile {
  return DoctorProfile.reconstitute({
    id: row.id,
    accountId: row.accountId,
    licenseNumber: row.licenseNumber,
    biography: row.biography ?? undefined,
    yearsOfExperience: row.yearsOfExperience ?? undefined,
    languages: row.languages,
    insuranceProviders: row.insuranceProviders,
    consultationFeeAmount: row.consultationFeeAmount ? Number(row.consultationFeeAmount) : undefined,
    hospitalId: row.hospitalId ?? undefined,
    specialtyId: row.specialtyId,
    professionalRank: (row.professionalRank as ProfessionalRank | null) ?? undefined,
    licenseExpiryDate: row.licenseExpiryDate ?? undefined,
    departmentId: row.departmentId ?? undefined,
    publications: row.publications.map((p) =>
      PortfolioPublication.reconstitute({
        id: p.id,
        title: p.title,
        reference: p.reference ?? undefined,
        publishedAt: p.publishedAt ?? undefined,
      }),
    ),
    awards: row.awards.map((a) =>
      PortfolioAward.reconstitute({
        id: a.id,
        title: a.title,
        issuingBody: a.issuingBody ?? undefined,
        awardedAt: a.awardedAt ?? undefined,
      }),
    ),
    workExperience: row.workExperience.map((w) =>
      PortfolioWorkExperience.reconstitute({
        id: w.id,
        organizationName: w.organizationName,
        position: w.position,
        professionalRank: (w.professionalRank as ProfessionalRank | null) ?? undefined,
        startDate: w.startDate,
        endDate: w.endDate ?? undefined,
        description: w.description ?? undefined,
      }),
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
