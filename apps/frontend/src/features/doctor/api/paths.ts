// `availability` moved to `SCHEDULING_PATHS.doctorAvailability`
// (`features/scheduling/api/paths.ts`, Phase 9) — availability is now owned
// by the Scheduling & Appointment Infrastructure, not Doctor.
export const DOCTOR_PATHS = {
  dashboardSummary: '/doctor/dashboard-summary',
  upcomingWork: '/doctor/upcoming-work',
  profile: '/doctor/profile',
  queue: '/doctor/queue',
} as const;
