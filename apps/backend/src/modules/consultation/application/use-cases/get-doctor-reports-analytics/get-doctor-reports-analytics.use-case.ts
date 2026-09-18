import { AppointmentStatus } from '../../../domain/enums/appointment-status.enum.js';
import type { AppointmentRepository } from '../../../domain/repositories/appointment.repository.js';
import type { ConsultationFeedbackRepository } from '../../../domain/repositories/consultation-feedback.repository.js';

import { resolvePreviousWindow } from './resolve-previous-window.js';

export interface GetDoctorReportsAnalyticsQuery {
  doctorId: string;
  dateFrom: Date;
  dateTo: Date;
  comparePrevious?: boolean;
}

export interface DoctorReportsAnalyticsBucketPoint {
  bucket: string;
  count: number;
}

export interface DoctorReportsAnalyticsPreviousPeriod {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface DoctorReportsAnalytics {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pendingApproval: number;
  upcoming: number;
  expired: number;
  averageRating: number | null;
  reviewCount: number;
  byBucket: DoctorReportsAnalyticsBucketPoint[];
  previousPeriod?: DoctorReportsAnalyticsPreviousPeriod;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Doctor Reports page rebuild (Phase 1): no existing "pick a bucket size
// from a date range's span" heuristic exists anywhere in the codebase today
// -- ReportingModule's own trend chart always requests 'day' buckets
// unconditionally (apps/frontend/.../appointment-analytics-panel.tsx), and
// its query DTO/use case just accept whatever bucket the caller passes.
// These thresholds are therefore this page's own new, explicit choice, not
// a value reused from an existing precedent.
const DAY_BUCKET_MAX_SPAN_DAYS = 31;
const WEEK_BUCKET_MAX_SPAN_DAYS = 180;

function resolveBucketSize(dateFrom: Date, dateTo: Date): 'day' | 'week' | 'month' {
  const spanDays = (dateTo.getTime() - dateFrom.getTime()) / DAY_MS;
  if (spanDays <= DAY_BUCKET_MAX_SPAN_DAYS) return 'day';
  if (spanDays <= WEEK_BUCKET_MAX_SPAN_DAYS) return 'week';
  return 'month';
}

// Doctor Workspace's rebuilt "Reports" page (docs: temporal-finding-canyon
// plan) -- real date-ranged appointment-status counts, tile-shaped per the
// plan's confirmed decisions, plus the trend chart's bucketed counts and an
// optional previous-period comparison snapshot. Distinct from
// GetDoctorReportsSummaryUseCase, which stays untouched and unused after
// this ships (decision 9): that one is a lifetime, unfiltered summary; this
// one is date-ranged with a real reconciliation invariant across all 7
// AppointmentStatus values.
export class GetDoctorReportsAnalyticsUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly consultationFeedbackRepository: ConsultationFeedbackRepository,
  ) {}

  async execute(query: GetDoctorReportsAnalyticsQuery): Promise<DoctorReportsAnalytics> {
    const { doctorId, dateFrom, dateTo } = query;
    const bucket = resolveBucketSize(dateFrom, dateTo);

    const [counts, pendingApproval, rating, byBucket] = await Promise.all([
      this.appointmentRepository.countByStatusForDoctorInRange(doctorId, dateFrom, dateTo),
      this.appointmentRepository.countFreeRequestedForDoctorInRange(doctorId, dateFrom, dateTo),
      this.consultationFeedbackRepository.getRatingAggregateForDoctorInRange(doctorId, dateFrom, dateTo),
      this.appointmentRepository.countByDoctorIdBucketed(doctorId, dateFrom, dateTo, bucket),
    ]);

    const requested = counts[AppointmentStatus.Requested] ?? 0;
    const confirmed = counts[AppointmentStatus.Confirmed] ?? 0;
    const rescheduled = counts[AppointmentStatus.Rescheduled] ?? 0;
    const cancelled = counts[AppointmentStatus.Cancelled] ?? 0;
    const noShow = counts[AppointmentStatus.NoShow] ?? 0;
    const completed = counts[AppointmentStatus.Completed] ?? 0;
    const expired = counts[AppointmentStatus.Expired] ?? 0;

    // Every Requested appointment that is NOT the free-pending-approval
    // subset is a paid booking simply waiting on the patient's payment --
    // "on the books, nothing for the doctor to act on," the same practical
    // category as Upcoming (plan decision 1). pendingApproval should never
    // exceed the real Requested count it's drawn from; if it ever does,
    // that's a real bug in the two queries disagreeing, not a value to
    // silently clamp away.
    if (pendingApproval > requested) {
      throw new Error(
        `Doctor reports analytics invariant violated: pendingApproval (${pendingApproval}) exceeds Requested count (${requested}) for doctor ${doctorId}.`,
      );
    }
    const paidUnconfirmedRequested = requested - pendingApproval;
    const upcoming = confirmed + rescheduled + paidUnconfirmedRequested;

    // Real sum of the 7 actual per-status counts returned by the
    // repository -- not recomputed from the derived tiles above, so a
    // mismatch between the two would show up as a failing reconciliation
    // test rather than being masked by construction.
    const totalAppointments = requested + confirmed + rescheduled + cancelled + noShow + completed + expired;

    const result: DoctorReportsAnalytics = {
      totalAppointments,
      completed,
      cancelled,
      noShow,
      pendingApproval,
      upcoming,
      expired,
      // Rating is returned raw/unthresholded regardless of how low
      // reviewCount is -- the 5-review "not enough ratings yet" gate is an
      // explicit frontend rendering decision (plan decision 5), never an
      // API-layer omission.
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
      byBucket,
    };

    if (query.comparePrevious) {
      const previousWindow = resolvePreviousWindow(dateFrom, dateTo);
      const previousCounts = await this.appointmentRepository.countByStatusForDoctorInRange(
        doctorId,
        previousWindow.from,
        previousWindow.to,
      );
      const previousRequested = previousCounts[AppointmentStatus.Requested] ?? 0;
      const previousConfirmed = previousCounts[AppointmentStatus.Confirmed] ?? 0;
      const previousRescheduled = previousCounts[AppointmentStatus.Rescheduled] ?? 0;
      const previousCancelled = previousCounts[AppointmentStatus.Cancelled] ?? 0;
      const previousNoShow = previousCounts[AppointmentStatus.NoShow] ?? 0;
      const previousCompleted = previousCounts[AppointmentStatus.Completed] ?? 0;
      const previousExpired = previousCounts[AppointmentStatus.Expired] ?? 0;

      result.previousPeriod = {
        totalAppointments:
          previousRequested +
          previousConfirmed +
          previousRescheduled +
          previousCancelled +
          previousNoShow +
          previousCompleted +
          previousExpired,
        completed: previousCompleted,
        cancelled: previousCancelled,
        noShow: previousNoShow,
      };
    }

    return result;
  }
}
