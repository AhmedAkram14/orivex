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
  // not /patient/profile.
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
  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the real backend
  // route (PatientModule's PatientProfileController) -- a side-effect-free
  // existence check, deliberately distinct from `profile` above (GET
  // /patients/me), which lazily creates a bare profile on first read.
  exists: '/patients/me/exists',
  // Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): the real
  // backend routes (TrustModule's PatientVerificationController /
  // RequiresIdentityVerificationGuard's UX-convenience endpoint).
  identityVerificationStatus: '/patients/me/identity-verification-status',
  verifications: (patientProfileId: string) => `/patients/${patientProfileId}/verifications`,
  // Onboarding Redesign integration-gap closure (2026-07-25): the real
  // backend route (ConsultationModule's AppointmentController) -- distinct
  // from `appointments` above (GET /appointments/me), which only ever lists.
  createAppointment: '/appointments',
  // Patient-Facing Reschedule (Phase 3 Step 2): the real backend route
  // (ConsultationModule's AppointmentController) -- PATCH /appointments/:id,
  // distinct from `createAppointment` (POST /appointments) above.
  appointment: (id: string) => `/appointments/${id}`,
} as const;
