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
  profile: '/patient/profile',
  appointments: '/patient/appointments',
  medicalRecords: '/patient/medical-records',
} as const;
