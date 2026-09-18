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
  // Doctor Workspace dashboard redesign: real distinct-patient list and
  // real appointment-status/rating summary (ConsultationModule's
  // AppointmentController).
  patients: '/appointments/doctor/patients',
  reportsSummary: '/appointments/doctor/reports-summary',
  // Doctor Reports page rebuild (Phase 1/3): the real, date-ranged 7-tile +
  // trend + optional previous-period replacement `reports-summary.tsx` now
  // reads from -- `reports-summary` above stays in place, unused (decision 9).
  reportsAnalytics: (params: { dateFrom?: string; dateTo?: string; comparePrevious?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.comparePrevious) query.set('comparePrevious', String(params.comparePrevious));
    const qs = query.toString();
    return qs ? `/appointments/doctor/reports-analytics?${qs}` : '/appointments/doctor/reports-analytics';
  },
  // Doctor Schedule Redesign: the one real doctor-appointments route that
  // accepts a caller-supplied date range, backing the weekly calendar grid.
  // Doctor Reports page rebuild (Phase 2): optional `status` drill-down
  // filter from a Reports-tile link (`?status=` wired through
  // `getDoctorSchedule` server-side).
  schedule: (from: string, to: string, status?: string) => {
    const query = new URLSearchParams({ from, to });
    if (status) query.set('status', status);
    return `/appointments/doctor/schedule?${query.toString()}`;
  },
  // Doctor Reports page rebuild (Phase 2): CSV export of the same
  // date-ranged reports analytics the Reports page renders -- mirrors
  // ReportingModule's own `/admin/analytics/export` raw-CSV-body route,
  // scoped to this doctor and date range instead of an admin-picked section.
  reportsExport: (params: { dateFrom?: string; dateTo?: string; comparePrevious?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.comparePrevious) query.set('comparePrevious', String(params.comparePrevious));
    const qs = query.toString();
    return qs ? `/appointments/doctor/reports-export?${qs}` : '/appointments/doctor/reports-export';
  },
  approveAppointment: (appointmentId: string) => `/appointments/${appointmentId}/approve`,
  // Doctor Patient Chart Phase 2: the doctor's explicit rejection of a
  // Requested booking, before ever approving it -- applies to any Requested
  // appointment regardless of Free/Paid pricing tier (unlike approve above).
  declineAppointment: (appointmentId: string) => `/appointments/${appointmentId}/decline`,
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
  // Doctor-facing Patient Chart (protected): ClinicalModule's
  // DoctorPatientChartController -- JwtAuthGuard + RolesGuard(Doctor) + a
  // real doctor-patient relationship check, DOCTOR-OWNED ENCOUNTERS ONLY.
  // Distinct from `PublicPatient`'s own `/public/patients/:id` (name/avatar
  // only, no sign-in) -- these routes never accept an unauthenticated call.
  patientChartProfile: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/profile`,
  patientChartAppointments: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/appointments`,
  patientChartMedicalRecords: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/medical-records`,
  patientChartPrescriptions: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/prescriptions`,
  patientChartDocuments: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/documents`,
  patientChartVitals: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/vitals`,
  // Doctor Patient Chart Phase 4.1: doctor-only write, HealthGraphController
  // (not the read-only DoctorPatientChartController above) -- lives under
  // /patients, not /doctor/patients.
  addPatientCondition: (patientProfileId: string) => `/patients/${patientProfileId}/health-graph/conditions`,
  // Phase 4.2: ClinicalModule's own wrapper over AssetModule, distinct from
  // /media-assets/* -- ownerAccountId is always resolved server-side to the
  // patient's own account, never the calling doctor's.
  patientChartDocumentUploadIntent: (patientProfileId: string) => `/doctor/patients/${patientProfileId}/documents/upload-intent`,
  patientChartDocumentConfirm: (patientProfileId: string, documentId: string) =>
    `/doctor/patients/${patientProfileId}/documents/${documentId}/confirm`,
  // Phase 4.3: PatientModule's own doctor-write route, authorized via the
  // same shared treating-relationship check as the two routes above.
  confirmNoKnownAllergies: (patientProfileId: string) => `/patients/${patientProfileId}/allergies/confirm-none`,
} as const;
