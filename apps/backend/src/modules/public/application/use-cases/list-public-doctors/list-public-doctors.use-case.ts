import type { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';
import type { PublicDirectoryQueryPort } from '../../ports/public-directory-query.port.js';

import type { ListPublicDoctorsQuery } from './list-public-doctors.query.js';

export interface PublicDoctorListing {
  doctorProfileId: string;
  fullName: string;
  professionalRank?: ProfessionalRank;
  specialtyName: string;
  hospitalId?: string;
  consultationFeeAmount?: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface PublicDoctorListingResult {
  doctors: PublicDoctorListing[];
  total: number;
}

// Public Landing Page (2026-07-29): powers the "Popular Doctors" section.
// Ranking caveat, stated plainly rather than oversold: rating aggregates
// live in ConsultationFeedback (a different aggregate entirely), so there is
// no single SQL query that can sort a paginated doctor list by rating across
// the whole table -- the same cross-aggregate boundary that already forced
// GET /doctors/:id/reviews into its own controller (see that controller's
// header comment). This use case's ranking is therefore honestly page-local:
// the underlying query orders by newest-first, and only the doctors
// returned on *this* page are then re-sorted by real rating. For a small,
// single-page "Popular Doctors" section (a handful of cards) this reads
// correctly; it is not a true global "top rated doctor on the platform"
// query, and should not be presented as one if this use case is ever reused
// for a paginated, multi-page listing.
export class ListPublicDoctorsUseCase {
  constructor(
    private readonly publicDirectoryQueryPort: PublicDirectoryQueryPort,
    private readonly getDoctorRatingAggregatesUseCase: GetDoctorRatingAggregatesUseCase,
  ) {}

  async execute(query: ListPublicDoctorsQuery): Promise<PublicDoctorListingResult> {
    const offset = (query.page - 1) * query.limit;
    const { entries, total } = await this.publicDirectoryQueryPort.searchDoctors({
      specialtyId: query.specialtyId,
      limit: query.limit,
      offset,
    });

    const aggregates = await this.getDoctorRatingAggregatesUseCase.execute({
      doctorIds: entries.map((entry) => entry.doctorProfileId),
    });

    const doctors = entries
      .map((entry): PublicDoctorListing => {
        const aggregate = aggregates.get(entry.doctorProfileId);
        return {
          doctorProfileId: entry.doctorProfileId,
          fullName: entry.fullName,
          professionalRank: entry.professionalRank,
          specialtyName: entry.specialtyName,
          hospitalId: entry.hospitalId,
          consultationFeeAmount: entry.consultationFeeAmount,
          averageRating: aggregate?.averageRating ?? null,
          reviewCount: aggregate?.reviewCount ?? 0,
        };
      })
      .sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));

    return { doctors, total };
  }
}
