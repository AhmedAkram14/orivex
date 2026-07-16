/**
 * Path constants for `/patient/*` — mirrors `features/doctor/api/paths.ts`'s
 * convention exactly. Dashboard-preview endpoints (`dashboardSummary`,
 * `upcomingAppointments`, `activePrescriptions`) are deliberately distinct
 * from the full list endpoints milestones 3/5 add later (`appointments`,
 * `prescriptions`) — a dashboard preview and a paginated/filterable full
 * list are different shapes, not the same data sliced client-side.
 */
export const PATIENT_PATHS = {
  dashboardSummary: '/patient/dashboard-summary',
  upcomingAppointments: '/patient/upcoming-appointments',
  activePrescriptions: '/patient/active-prescriptions',
  // The real backend route (PatientModule's PatientProfileController) --
  // not /patient/profile. Every other path in this object remains MSW-only
  // (no backend implementation exists yet for those features).
  profile: '/patients/me',
  // The real backend route (ConsultationModule's AppointmentController) --
  // not /patient/appointments.
  appointments: '/appointments/me',
  medicalRecords: '/patient/medical-records',
  prescriptions: '/patient/prescriptions',
  healthDashboard: '/patient/health-dashboard',
} as const;
