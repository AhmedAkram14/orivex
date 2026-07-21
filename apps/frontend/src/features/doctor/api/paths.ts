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
  // Doctor Onboarding (Phase 4 continuation) -- the same DoctorProfileController
  // real backend routes, reused as-is: POST /doctors (register), and the
  // caller's own verification history under /doctors/:id/verifications.
  register: '/doctors',
  verifications: (doctorId: string) => `/doctors/${doctorId}/verifications`,
  // AdministrationModule's real public hospital directory (not the
  // SuperAdmin-only /admin/hospitals) -- any authenticated account can
  // browse it to pick an affiliation.
  hospitals: '/hospitals',
} as const;
