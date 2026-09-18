import type { DoctorReportsAnalytics } from '../../application/use-cases/get-doctor-reports-analytics/get-doctor-reports-analytics.use-case.js';

export class DoctorReportsAnalyticsBucketPointDto {
  bucket!: string;
  count!: number;
}

export class DoctorReportsAnalyticsPreviousPeriodDto {
  totalAppointments!: number;
  completed!: number;
  cancelled!: number;
  noShow!: number;
}

// Backs GET /appointments/doctor/reports-analytics (Doctor Reports page
// rebuild, Phase 1) -- a flat DTO mirroring GetDoctorReportsAnalyticsUseCase's
// own return shape exactly. Distinct from, and does not replace,
// doctor-reports-summary-response.dto.ts, which stays as-is per decision 9.
export class DoctorReportsAnalyticsResponseDto {
  totalAppointments!: number;
  completed!: number;
  cancelled!: number;
  noShow!: number;
  pendingApproval!: number;
  upcoming!: number;
  expired!: number;
  averageRating!: number | null;
  reviewCount!: number;
  byBucket!: DoctorReportsAnalyticsBucketPointDto[];
  previousPeriod?: DoctorReportsAnalyticsPreviousPeriodDto;

  static fromDomain(analytics: DoctorReportsAnalytics): DoctorReportsAnalyticsResponseDto {
    const dto = new DoctorReportsAnalyticsResponseDto();
    dto.totalAppointments = analytics.totalAppointments;
    dto.completed = analytics.completed;
    dto.cancelled = analytics.cancelled;
    dto.noShow = analytics.noShow;
    dto.pendingApproval = analytics.pendingApproval;
    dto.upcoming = analytics.upcoming;
    dto.expired = analytics.expired;
    dto.averageRating = analytics.averageRating;
    dto.reviewCount = analytics.reviewCount;
    dto.byBucket = analytics.byBucket;
    if (analytics.previousPeriod) {
      dto.previousPeriod = analytics.previousPeriod;
    }
    return dto;
  }
}
