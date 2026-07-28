// `availability` moved to `SCHEDULING_PATHS.doctorAvailability`
// (`features/scheduling/api/paths.ts`, Phase 9) — availability is now owned
// by the Scheduling & Appointment Infrastructure, not Doctor.
export const DOCTOR_PATHS = {
  // Real backend endpoints (ConsultationModule's AppointmentController) --
  // MSW (`mocks/handlers/doctor.ts`) now intercepts these purely to keep the
  // frontend test suite deterministic, matching `features/patient/api/paths.ts`'s
  // own real `/appointments/me` precedent.
  dashboardSummary: '/appointments/doctor/dashboard-summary',
  upcomingWork: '/appointments/doctor/upcoming-work',
  // The real backend route (DoctorModule's DoctorProfileController) — not
  // /doctor/profile. Mirrors `features/patient/api/paths.ts`'s exact comment
  // style for its own real `/patients/me` route.
  profile: '/doctors/me',
  // The real backend route (ConsultationModule's AppointmentController) --
  // not /doctor/queue.
  queue: '/appointments/doctor/queue',
  // Doctor-approval-workflow fix: every booking (Free or Paid) now lands
  // Requested and waits here until the doctor approves it.
  pendingApproval: '/appointments/doctor/pending-approval',
  approveAppointment: (appointmentId: string) => `/appointments/${appointmentId}/approve`,
  // Doctor Onboarding (Phase 4 continuation) -- the same DoctorProfileController
  // real backend routes, reused as-is: POST /doctors (register), and the
  // caller's own verification history under /doctors/:id/verifications.
  register: '/doctors',
  verifications: (doctorId: string) => `/doctors/${doctorId}/verifications`,
  // AdministrationModule's real public hospital directory (not the
  // SuperAdmin-only /admin/hospitals) -- any authenticated account can
  // browse it to pick an affiliation.
  hospitals: '/hospitals',
  // Onboarding Redesign (2026-07-21 proposal, Stage O.6): the same public,
  // any-authenticated-account mirror of AdministrationController's
  // SuperAdmin-only /admin/hospitals/:id/departments.
  departmentsByHospital: (hospitalId: string) => `/hospitals/${hospitalId}/departments`,
  // Onboarding Redesign (2026-07-21 proposal, Stage O.5): the same real
  // GET /doctors (no id) DoctorProfileController route as `profile`/`register`
  // above -- the Patient Dashboard's Browse/Search Doctors screen.
  list: '/doctors',
  // Public single-doctor lookup (DoctorProfileController's GET /doctors/:id)
  // -- backs the patient-facing doctor profile view.
  byId: (doctorProfileId: string) => `/doctors/${doctorProfileId}`,
  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
  // SuperAdmin-only lookup by account id -- backs the verification
  // case-detail page's Doctor-specific context section (a VerificationCase
  // only stores subjectAccountId, never a doctorProfileId).
  byAccountId: (accountId: string) => `/doctors/by-account/${accountId}`,
} as const;
