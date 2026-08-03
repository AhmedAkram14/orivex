import type { ReportFilter } from '../dto/report-filter.js';

export type AnalyticsBucket = 'day' | 'week' | 'month' | 'year';

export interface AppointmentBucketPoint {
  bucket: string;
  count: number;
}

export interface HourCount {
  hour: number;
  count: number;
}

export interface DayOfWeekCount {
  dayOfWeek: number;
  count: number;
}

export interface AppointmentAnalyticsResult {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  upcomingCount: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  byBucket: AppointmentBucketPoint[];
  // Bucketed on Appointment.scheduledAt (when the patient is seen -- an
  // operational/staffing question), not createdAt (when the booking UI was
  // used). See PrismaAppointmentAnalyticsQueryService's own comment.
  peakHours: HourCount[];
  peakDays: DayOfWeekCount[];
  typeDistribution: { free: number; paid: number };
}

export interface AppointmentAnalyticsQueryPort {
  getAnalytics(filter: ReportFilter, bucket: AnalyticsBucket): Promise<AppointmentAnalyticsResult>;
}
