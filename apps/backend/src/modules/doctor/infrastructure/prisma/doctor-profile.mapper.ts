import type {
  DoctorProfile as PrismaDoctorProfileRow,
  PortfolioAward as PrismaPortfolioAwardRow,
  PortfolioPublication as PrismaPortfolioPublicationRow,
} from '@prisma/client';

import { DoctorProfile } from '../../domain/entities/doctor-profile.entity.js';
import { PortfolioAward } from '../../domain/entities/portfolio-award.entity.js';
import { PortfolioPublication } from '../../domain/entities/portfolio-publication.entity.js';

export type PersistedDoctorProfileRow = PrismaDoctorProfileRow & {
  publications: PrismaPortfolioPublicationRow[];
  awards: PrismaPortfolioAwardRow[];
};

export function toDomainDoctorProfile(row: PersistedDoctorProfileRow): DoctorProfile {
  return DoctorProfile.reconstitute({
    id: row.id,
    accountId: row.accountId,
    licenseNumber: row.licenseNumber,
    specialty: row.specialty,
    biography: row.biography ?? undefined,
    yearsOfExperience: row.yearsOfExperience ?? undefined,
    languages: row.languages,
    consultationFeeAmount: row.consultationFeeAmount ? Number(row.consultationFeeAmount) : undefined,
    hospitalId: row.hospitalId ?? undefined,
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
