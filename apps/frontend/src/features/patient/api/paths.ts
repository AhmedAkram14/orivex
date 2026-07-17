/**
 * Path constants for `/patient/*` — mirrors `features/doctor/api/paths.ts`'s
 * convention exactly. Dashboard-preview endpoints (`dashboardSummary`,
 * `upcomingAppointments`, `activePrescriptions`) are deliberately distinct
 * from the full list endpoints milestones 3/5 add later (`appointments`,
 * `prescriptions`) — a dashboard preview and a paginated/filterable full
 * list are different shapes, not the same data sliced client-side.
 */
export const PATIENT_PATHS = {
  // The real backend route (ClinicalModule's PatientDashboardController) --
  // not /patient/dashboard-summary.
  dashboardSummary: '/patients/me/dashboard-summary',
  // The real backend route (ClinicalModule's PatientDashboardController) --
  // not /patient/upcoming-appointments.
  upcomingAppointments: '/patients/me/upcoming-appointments',
  // The real backend route (ClinicalModule's PatientDashboardController) --
  // not /patient/active-prescriptions.
  activePrescriptions: '/patients/me/active-prescriptions',
  // The real backend route (PatientModule's PatientProfileController) --
  // not /patient/profile. Every other path in this object remains MSW-only
  // (no backend implementation exists yet for those features).
  profile: '/patients/me',
  // The real backend route (ConsultationModule's AppointmentController) --
  // not /patient/appointments.
  appointments: '/appointments/me',
  // The real backend route (ClinicalModule's PatientDashboardController) --
  // not /patient/medical-records.
  medicalRecords: '/patients/me/medical-records',
  // The real backend route (ClinicalModule's PatientDashboardController) --
  // not /patient/prescriptions.
  prescriptions: '/patients/me/prescriptions',
  // The real backend route (ClinicalModule's PatientDashboardController) --
  // not /patient/health-dashboard.
  healthDashboard: '/patients/me/health-dashboard',
} as const;
