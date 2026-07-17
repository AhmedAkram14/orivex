// Backs GET /appointments/doctor/dashboard-summary, matching the frontend's
// `DoctorDashboardSummary` shape (`apps/frontend/src/features/doctor/api/types.ts`)
// exactly. All three counts are computed from today's Appointments only --
// see AppointmentController's private helper for the exact status rules
// (there is no live queue/check-in system yet, `patientsInQueue` is an
// honestly-documented proxy, not a fabricated concept).
export class DoctorDashboardSummaryResponseDto {
  consultationsToday!: number;
  patientsInQueue!: number;
  completedToday!: number;
}
