// Backs GET /appointments/doctor/reports-summary, matching the frontend's
// `DoctorReportsSummary` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. No day-over-day/time-series fields -- see
// GetDoctorReportsSummaryUseCase's own comment for why none exist.
export class DoctorReportsSummaryResponseDto {
  totalAppointments!: number;
  confirmed!: number;
  completed!: number;
  cancelled!: number;
  noShow!: number;
  averageRating!: number | null;
  reviewCount!: number;
}
