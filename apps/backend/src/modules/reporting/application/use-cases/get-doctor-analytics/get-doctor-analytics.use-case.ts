import type { GetDoctorRatingAggregatesUseCase } from '../../../../consultation/application/use-cases/get-doctor-rating-aggregate/get-doctor-rating-aggregates.use-case.js';
import type { ReportFilter } from '../../dto/report-filter.js';
import type { DoctorActivityRow, DoctorAnalyticsQueryPort } from '../../ports/doctor-analytics-query.port.js';

export type DoctorSortBy = 'revenue' | 'rating' | 'completedConsultations' | 'patientCount';

export interface DoctorAnalyticsEntry extends DoctorActivityRow {
  cancellationRate: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface GetDoctorAnalyticsOptions {
  sortBy?: DoctorSortBy;
  limit?: number;
}

export interface DoctorAnalyticsResult {
  entries: DoctorAnalyticsEntry[];
  total: number;
}

// The Top Doctors / Top Rated / Top Revenue leaderboards are all this same
// use case with a different `sortBy` -- one implementation, not one per
// leaderboard (no duplicated table logic). Rating comes from
// ConsultationModule's own exported, already-batched
// GetDoctorRatingAggregatesUseCase -- never re-derived here.
export class GetDoctorAnalyticsUseCase {
  constructor(
    private readonly doctorAnalyticsQuery: DoctorAnalyticsQueryPort,
    private readonly getDoctorRatingAggregatesUseCase: GetDoctorRatingAggregatesUseCase,
  ) {}

  async execute(filter: ReportFilter, options: GetDoctorAnalyticsOptions): Promise<DoctorAnalyticsResult> {
    const activity = await this.doctorAnalyticsQuery.getActivity(filter);
    const ratings = await this.getDoctorRatingAggregatesUseCase.execute({
      doctorIds: activity.map((row) => row.doctorId),
    });

    const entries: DoctorAnalyticsEntry[] = activity.map((row) => {
      const rating = ratings.get(row.doctorId);
      return {
        ...row,
        cancellationRate: row.totalAppointments > 0 ? row.cancelledCount / row.totalAppointments : 0,
        averageRating: rating?.averageRating ?? null,
        reviewCount: rating?.reviewCount ?? 0,
      };
    });

    const sortBy = options.sortBy ?? 'revenue';
    entries.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.averageRating ?? -1) - (a.averageRating ?? -1);
        case 'completedConsultations':
          return b.completedConsultations - a.completedConsultations;
        case 'patientCount':
          return b.patientCount - a.patientCount;
        case 'revenue':
        default:
          return b.revenueGenerated - a.revenueGenerated;
      }
    });

    const total = entries.length;
    const limited = options.limit ? entries.slice(0, options.limit) : entries;
    return { entries: limited, total };
  }
}
