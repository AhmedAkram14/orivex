import type { GetDoctorBookingCountsUseCase } from '../../../../consultation/application/use-cases/get-doctor-booking-counts/get-doctor-booking-counts.use-case.js';
import type { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { ProfessionalRank } from '../../../../doctor/domain/enums/professional-rank.enum.js';
import type { GetDoctorsOpenOnDatesUseCase } from '../../../../scheduling/application/use-cases/get-doctors-open-on-dates/get-doctors-open-on-dates.use-case.js';
import type { PublicDirectoryQueryPort } from '../../ports/public-directory-query.port.js';

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

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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
    private readonly getDoctorBookingCountsUseCase: GetDoctorBookingCountsUseCase,
    private readonly getDoctorsOpenOnDatesUseCase: GetDoctorsOpenOnDatesUseCase,
  ) {}

  async execute(query: ListPublicDoctorsQuery): Promise<PublicDoctorListingResult> {
    const offset = (query.page - 1) * query.limit;
    const { entries, total } = await this.publicDirectoryQueryPort.searchDoctors({
      specialtyId: query.specialtyId,
      limit: query.limit,
      offset,
    });

    const doctorIds = entries.map((entry) => entry.doctorProfileId);
    const today = toIsoDate(new Date());
    const tomorrow = toIsoDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const [aggregates, bookingCounts, openOnDates] = await Promise.all([
      this.getDoctorRatingAggregatesUseCase.execute({ doctorIds }),
      this.getDoctorBookingCountsUseCase.execute({ doctorIds }),
      this.getDoctorsOpenOnDatesUseCase.execute({ doctorIds, dates: [today, tomorrow] }),
    ]);

    const doctors = entries
      .map((entry): PublicDoctorListing => {
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
      })
      .sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));

    // Page-local tags only (see this file's header comment on ranking
    // scope): the top-rated slot never goes to a doctor with no reviews yet,
    // and a doctor is never tagged both -- top-rated wins.
    const topRated = doctors.find((doctor) => doctor.reviewCount > 0);
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
}
