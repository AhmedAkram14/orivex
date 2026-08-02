import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';
import type { GetDoctorRatingAggregateUseCase } from '../get-doctor-rating-aggregate/get-doctor-rating-aggregate.use-case.js';

export interface GetDoctorReportsSummaryQuery {
  doctorId: string;
}

export interface DoctorReportsSummary {
  totalAppointments: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  averageRating: number | null;
  reviewCount: number;
}

// The Doctor Workspace's "Reports" page -- real appointment-status counts
// (a single groupBy, AppointmentRepository.countByStatusForDoctor) plus the
// doctor's own real rating aggregate (the same GetDoctorRatingAggregateUseCase
// DoctorRatingSummary already calls for public profiles). Deliberately no
// day-over-day/time-series figures: there is no historical snapshot to diff
// against, so none is fabricated -- this is a point-in-time summary only.
export class GetDoctorReportsSummaryUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly getDoctorRatingAggregateUseCase: GetDoctorRatingAggregateUseCase,
  ) {}

  async execute(query: GetDoctorReportsSummaryQuery): Promise<DoctorReportsSummary> {
    const [counts, rating]: [Partial<Record<AppointmentStatus, number>>, DoctorRatingAggregate] = await Promise.all([
      this.appointmentRepository.countByStatusForDoctor(query.doctorId),
      this.getDoctorRatingAggregateUseCase.execute({ doctorId: query.doctorId }),
    ]);

    const confirmed = counts[AppointmentStatus.Confirmed] ?? 0;
    const completed = counts[AppointmentStatus.Completed] ?? 0;
    const cancelled = counts[AppointmentStatus.Cancelled] ?? 0;
    const noShow = counts[AppointmentStatus.NoShow] ?? 0;
    const totalAppointments = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);

    return {
      totalAppointments,
      confirmed,
      completed,
      cancelled,
      noShow,
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
    };
  }
}
