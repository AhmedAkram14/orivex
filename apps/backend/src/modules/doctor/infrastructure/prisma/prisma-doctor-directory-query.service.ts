import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
// Plain TypeScript-class reuse, NOT a NestJS import -- PrismaConsultationFeedbackRepository's
// only dependency is the same shared PrismaService this class already has
// (confirmed: its constructor takes nothing else), so instantiating it
// directly here creates zero NestJS module-graph coupling (no @Module
// import, no DI cycle) despite living under ConsultationModule's folder.
// This is how I10's rating filter reuses the exact same, already-tested
// aggregate query ConsultationModule's own GetDoctorRatingAggregatesUseCase
// calls (docs/01-prd.md's rating filter) without duplicating its logic and
// without the real circular-module-dependency this file's own prior
// comment (and DoctorReviewsController living in ConsultationModule
// instead of here) had documented as the blocker.
import { PrismaConsultationFeedbackRepository } from '../../../consultation/infrastructure/prisma/prisma-consultation-feedback.repository.js';
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
//
// I10 -- Doctor discovery filters (docs/01-prd.md names 9: language,
// gender, price, availability window, free/paid, rating, years of
// experience, specialty, condition). Eight are implemented here (specialty
// x2, hospital, language, gender, price, free/paid, availability window,
// years of experience, rating). One remains a deliberate, disclosed gap:
//   - condition: no Condition/MedicalCondition reference table or
//     specialty-to-condition mapping exists anywhere in this schema; the
//     only "condition" concept in the codebase is HealthGraphNodeType
//     .Condition on a patient's own clinical record, which must never be
//     used to build a doctor-search filter (it would leak patient data).
//     The PRD's own line naming this (docs/01-prd.md §2.2) reads
//     "Specialty/condition search" -- grammatically a free-text search
//     pairing, not a defined structured filter -- and is never glossed
//     anywhere else in the docs. This is a genuine product-definition gap,
//     not an engineering one; see this module's own I10 report for the
//     minimum decision required before it can be built.
@Injectable()
export class PrismaDoctorDirectoryQueryService implements DoctorDirectoryQueryPort {
  private readonly consultationFeedbackRepository: PrismaConsultationFeedbackRepository;

  constructor(private readonly prisma: PrismaService) {
    this.consultationFeedbackRepository = new PrismaConsultationFeedbackRepository(prisma);
  }

  async search(filter: DoctorDirectoryFilter): Promise<DoctorDirectoryResult> {
    const availabilityWindowFilter: Prisma.AvailabilityWindowWhereInput = {
      status: 'OPEN',
      ...(filter.consultationType ? { consultationType: filter.consultationType } : {}),
      ...(filter.availableWithinDays
        ? { startTime: { gte: new Date(), lte: new Date(Date.now() + filter.availableWithinDays * 24 * 60 * 60_000) } }
        : {}),
    };
    const hasAvailabilityFilter = Boolean(filter.consultationType || filter.availableWithinDays);

    const where: Prisma.DoctorProfileWhereInput = {
      ...(filter.hospitalId ? { hospitalId: filter.hospitalId } : {}),
      ...(filter.specialty ? { medicalSpecialty: { name: { contains: filter.specialty, mode: 'insensitive' } } } : {}),
      ...(filter.specialtyId ? { specialtyId: filter.specialtyId } : {}),
      ...(filter.language ? { languages: { has: filter.language } } : {}),
      ...(filter.gender ? { account: { gender: filter.gender } } : {}),
      ...(filter.minYearsOfExperience !== undefined ? { yearsOfExperience: { gte: filter.minYearsOfExperience } } : {}),
      ...(filter.minFeeAmount !== undefined || filter.maxFeeAmount !== undefined
        ? {
            consultationFeeAmount: {
              ...(filter.minFeeAmount !== undefined ? { gte: filter.minFeeAmount } : {}),
              ...(filter.maxFeeAmount !== undefined ? { lte: filter.maxFeeAmount } : {}),
            },
          }
        : {}),
      ...(hasAvailabilityFilter ? { availabilityWindows: { some: availabilityWindowFilter } } : {}),
    };

    if (filter.minRating === undefined) {
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
      return { total, entries: rows.map((row) => this.toEntry(row)) };
    }

    // Rating filter: ConsultationFeedback is a different aggregate root
    // (ConsultationModule owns it), so "average rating >= X" can't be
    // expressed as a DoctorProfile-local Prisma `where` clause the way the
    // other 7 filters are. Correct approach (per this module's own I10
    // report -- filtering must happen before pagination, never "fetch a
    // page then filter in memory"): resolve every DoctorProfile matching
    // the other filters (unpaginated), batch-fetch their real rating
    // aggregates via the same VISIBLE-only aggregate ConsultationModule
    // itself uses, filter server-side by the threshold, THEN paginate the
    // filtered set. A doctor with zero (non-flagged) reviews has no
    // aggregate entry at all and is excluded from any minRating>0 filter --
    // "at least N stars" cannot be true of a doctor with no rating data,
    // matching DoctorRatingSummary's own established "never fabricate a
    // 0.0 rating" convention on the frontend.
    const candidates = await this.prisma.doctorProfile.findMany({
      where,
      include: { account: { select: { displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const ratingAggregates = await this.consultationFeedbackRepository.getRatingAggregatesForDoctors(
      candidates.map((row) => row.id),
    );
    const matching = candidates.filter((row) => {
      const aggregate = ratingAggregates.get(row.id);
      if (!aggregate || aggregate.averageRating === null) {
        return false;
      }
      return aggregate.averageRating >= filter.minRating!;
    });

    const page = matching.slice(filter.offset, filter.offset + filter.limit);
    return { total: matching.length, entries: page.map((row) => this.toEntry(row)) };
  }

  private toEntry(row: {
    id: string;
    accountId: string;
    account: { displayName: string; avatarUrl: string | null };
    specialtyId: string;
    yearsOfExperience: number | null;
    consultationFeeAmount: Prisma.Decimal | null;
    hospitalId: string | null;
  }) {
    return {
      doctorProfileId: row.id,
      accountId: row.accountId,
      displayName: row.account.displayName,
      specialtyId: row.specialtyId,
      yearsOfExperience: row.yearsOfExperience ?? undefined,
      consultationFeeAmount: row.consultationFeeAmount ? Number(row.consultationFeeAmount) : undefined,
      hospitalId: row.hospitalId ?? undefined,
      avatarUrl: row.account.avatarUrl ?? undefined,
    };
  }
}
