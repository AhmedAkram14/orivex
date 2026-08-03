import type { ReportFilter } from '../dto/report-filter.js';

// Deliberately excludes rating -- GetDoctorAnalyticsUseCase merges this row
// set with ConsultationModule's own exported GetDoctorRatingAggregatesUseCase
// (batched, already exists) rather than this module re-deriving the same
// ConsultationFeedback aggregate.
export interface DoctorActivityRow {
  doctorId: string;
  displayName: string;
  specialtyId: string | null;
  completedConsultations: number;
  upcomingAppointments: number;
  cancelledCount: number;
  totalAppointments: number;
  averageSessionDurationMinutes: number | null;
  revenueGenerated: number;
  patientCount: number;
}

export interface DoctorAnalyticsQueryPort {
  getActivity(filter: ReportFilter): Promise<DoctorActivityRow[]>;
}
