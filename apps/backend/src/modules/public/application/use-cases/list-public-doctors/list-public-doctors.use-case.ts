import type { GetDoctorBookingCountsUseCase } from '../../../../consultation/application/use-cases/get-doctor-booking-counts/get-doctor-booking-counts.use-case.js';
import type { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';
import type { GetDoctorsOpenOnDatesUseCase } from '../../../../scheduling/application/use-cases/get-doctors-open-on-dates/get-doctors-open-on-dates.use-case.js';
import type { PublicDirectoryQueryPort, PublicDoctorEntry, PublicDoctorFilter } from '../../ports/public-directory-query.port.js';

import type { ListPublicDoctorsQuery } from './list-public-doctors.query.js';

export interface PublicDoctorListing {
  doctorProfileId: string;
  fullName: string;
  professionalRank?: ProfessionalRank;
  specialtyName: string;
  specialtyNameAr?: string;
  hospitalId?: string;
  hospitalName?: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  avatarUrl?: string;
  averageRating: number | null;
  reviewCount: number;
  writtenReviewCount: number;
  availability: 'today' | 'tomorrow' | null;
  isTopRated: boolean;
  isMostBooked: boolean;
}

// Typed through ConsultationModule's use case, not its domain repository -- this module only talks to its use cases.
type RatingAggregates = Awaited<ReturnType<GetDoctorRatingAggregatesUseCase['execute']>>;

const DAY_MS = 24 * 60 * 60 * 1000;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface PublicDoctorListingResult {
  doctors: PublicDoctorListing[];
  total: number;
}

// Public Landing Page (2026-07-29) + public Find-a-Doctor page (2026-10-06).
//
// Two execution paths, chosen by what the query asks for:
//
// * Everything it asks for is a DoctorProfile column (specialty, name, rank,
//   hospital/independent, fee range, experience, fee/experience sort): the
//   port filters, sorts AND paginates in SQL. Cheap at any size.
//
// * It filters or sorts on something another module owns -- average rating
//   and booking counts (ConsultationModule), open days (SchedulingModule):
//   there is no single SQL query across those aggregates (the same
//   cross-aggregate boundary documented on GET /doctors/:id/reviews), so the
//   port returns every doctor matching the column filters, this use case
//   asks those modules for their aggregates through their own use cases,
//   then filters/sorts/paginates in memory. The same approach the
//   authenticated directory already takes for its `minRating` filter --
//   fine for Egypt V1's verified-doctor population (hundreds, not
//   millions); revisit with a read-model if that stops being true.
//
// With no `sort` at all the original landing-page behaviour is kept exactly:
// newest first, then re-sorted by rating within the returned page only. The
// "Top rated"/"Most booked" badges stay page-local in every path: only the
// doctors on *this* page compete for them.
export class ListPublicDoctorsUseCase {
  constructor(
    private readonly publicDirectoryQueryPort: PublicDirectoryQueryPort,
    private readonly getDoctorRatingAggregatesUseCase: GetDoctorRatingAggregatesUseCase,
    private readonly getDoctorBookingCountsUseCase: GetDoctorBookingCountsUseCase,
    private readonly getDoctorsOpenOnDatesUseCase: GetDoctorsOpenOnDatesUseCase,
  ) {}

  async execute(query: ListPublicDoctorsQuery): Promise<PublicDoctorListingResult> {
    const offset = (query.page - 1) * query.limit;
    const now = Date.now();
    const today = toIsoDate(new Date(now));
    const tomorrow = toIsoDate(new Date(now + DAY_MS));
    // The card's "today"/"tomorrow" label always needs those two days; the `week` filter needs all seven.
    const dates =
      query.availability === 'week'
        ? Array.from({ length: 7 }, (_, index) => toIsoDate(new Date(now + index * DAY_MS)))
        : [today, tomorrow];

    const columnFilter: PublicDoctorFilter = {
      specialtyId: query.specialtyId,
      nameQuery: query.nameQuery,
      ranks: query.ranks,
      practice: query.practice,
      minFeeAmount: query.minFeeAmount,
      maxFeeAmount: query.maxFeeAmount,
      minYearsOfExperience: query.minYearsOfExperience,
      sort: query.sort === 'lowest_fee' || query.sort === 'most_experienced' ? query.sort : 'newest',
    };

    const needsCrossModuleStage =
      query.minRating !== undefined || query.availability !== undefined || query.sort === 'top_rated' || query.sort === 'most_booked';

    let pageEntries: PublicDoctorEntry[];
    let total: number;
    let aggregates: RatingAggregates;
    let bookingCounts: Map<string, number>;
    let openOnDates: Map<string, Set<string>>;

    if (needsCrossModuleStage) {
      const { entries } = await this.publicDirectoryQueryPort.searchDoctors(columnFilter);
      const doctorIds = entries.map((entry) => entry.doctorProfileId);
      [aggregates, bookingCounts, openOnDates] = await this.loadAggregates(doctorIds, dates);

      const matching = entries.filter((entry) => {
        const id = entry.doctorProfileId;
        if (query.minRating !== undefined) {
          const rating = aggregates.get(id)?.averageRating ?? null;
          if (rating === null || rating < query.minRating) return false;
        }
        if (query.availability === 'today' && !openOnDates.get(id)?.has(today)) return false;
        if (query.availability === 'week' && !(openOnDates.get(id)?.size ?? 0)) return false;
        return true;
      });

      // Array.prototype.sort is stable, so ties keep the port's newest-first order.
      if (query.sort === 'top_rated') {
        matching.sort((a, b) => {
          const left = aggregates.get(a.doctorProfileId);
          const right = aggregates.get(b.doctorProfileId);
          return (right?.averageRating ?? -1) - (left?.averageRating ?? -1) || (right?.reviewCount ?? 0) - (left?.reviewCount ?? 0);
        });
      } else if (query.sort === 'most_booked') {
        matching.sort((a, b) => (bookingCounts.get(b.doctorProfileId) ?? 0) - (bookingCounts.get(a.doctorProfileId) ?? 0));
      }

      total = matching.length;
      pageEntries = matching.slice(offset, offset + query.limit);
    } else {
      const result = await this.publicDirectoryQueryPort.searchDoctors({ ...columnFilter, limit: query.limit, offset });
      total = result.total;
      pageEntries = result.entries;
      [aggregates, bookingCounts, openOnDates] = await this.loadAggregates(
        pageEntries.map((entry) => entry.doctorProfileId),
        dates,
      );
    }

    const doctors = pageEntries.map((entry): PublicDoctorListing => {
      const aggregate = aggregates.get(entry.doctorProfileId);
      const openDates = openOnDates.get(entry.doctorProfileId);
      const availability = openDates?.has(today) ? 'today' : openDates?.has(tomorrow) ? 'tomorrow' : null;
      return {
        doctorProfileId: entry.doctorProfileId,
        fullName: entry.fullName,
        professionalRank: entry.professionalRank,
        specialtyName: entry.specialtyName,
        specialtyNameAr: entry.specialtyNameAr,
        hospitalId: entry.hospitalId,
        hospitalName: entry.hospitalName,
        yearsOfExperience: entry.yearsOfExperience,
        consultationFeeAmount: entry.consultationFeeAmount,
        avatarUrl: entry.avatarUrl,
        averageRating: aggregate?.averageRating ?? null,
        reviewCount: aggregate?.reviewCount ?? 0,
        writtenReviewCount: aggregate?.writtenReviewCount ?? 0,
        availability,
        isTopRated: false,
        isMostBooked: false,
      };
    });

    if (query.sort === undefined) {
      doctors.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));
    }

    // Page-local tags only (see this file's header comment on ranking
    // scope): the top-rated slot never goes to a doctor with no reviews yet,
    // and a doctor is never tagged both -- top-rated wins.
    const topRated = [...doctors]
      .filter((doctor) => doctor.reviewCount > 0)
      .sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1))[0];
    if (topRated) {
      topRated.isTopRated = true;
    }
    const mostBooked = doctors
      .filter((doctor) => !doctor.isTopRated)
      .map((doctor) => ({ doctor, count: bookingCounts.get(doctor.doctorProfileId) ?? 0 }))
      .sort((a, b) => b.count - a.count)[0];
    if (mostBooked && mostBooked.count > 0) {
      mostBooked.doctor.isMostBooked = true;
    }

    return { doctors, total };
  }

  private loadAggregates(
    doctorIds: string[],
    dates: string[],
  ): Promise<[RatingAggregates, Map<string, number>, Map<string, Set<string>>]> {
    return Promise.all([
      this.getDoctorRatingAggregatesUseCase.execute({ doctorIds }),
      this.getDoctorBookingCountsUseCase.execute({ doctorIds }),
      this.getDoctorsOpenOnDatesUseCase.execute({ doctorIds, dates }),
    ]);
  }
}
