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
  queue: '/doctor/queue',
} as const;
