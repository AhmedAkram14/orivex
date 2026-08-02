import type {
  DoctorDashboardSummary,
  DoctorDirectoryEntry,
  DoctorPatientListItem,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  DoctorReportsSummary,
  ListDoctorDirectoryParams,
  QueueEntry,
  RegisterDoctorProfileRequest,
  SubmitVerificationRequest,
  UpcomingWorkItem,
  VerificationCase,
} from '@/features/doctor/api/types';
import {
  findAllVerificationCasesBySubject,
  setSubjectVerificationCases,
  submitVerificationCase,
} from '@/mocks/verification-case-store';
import { listSpecialties } from '@/mocks/reference-store';

/**
 * In-memory mock "backend" state for `/doctor/*` — mirrors
 * `notifications-store.ts`'s pattern. `GET /appointments/doctor/dashboard-summary`
 * and `GET /appointments/doctor/upcoming-work` are now real backend endpoints
 * (ConsultationModule's AppointmentController), so these mocks now exist
 * purely to keep the frontend test suite deterministic, matching
 * `patient-store.ts`'s `seedAppointments()` precedent.
 *
 * Dashboard visual-QA pass (2026-08): a believable "busy practice day" seed,
 * matching this store's existing precedent for `seedProfile()`'s bio data —
 * a dev/test fixture only, never a claim about a real backend response. A
 * *real* doctor account with genuinely zero appointments still renders the
 * honest empty state (`DoctorDashboardPage.test.tsx` proves the empty-state
 * rendering path still works by overriding this handler back to `[]`/zero for
 * that one case). All times are offsets from "now" (not fixed clock hours) so
 * the seed reads as "today" and stays internally coherent (an "upcoming" item
 * is always actually in the future) no matter what time of day the dev
 * server/tests run — mirroring `notifications-store.ts`'s own
 * `Date.now() - N` convention.
 *
 * `consultationsToday`/`patientsInQueue`/`completedToday` intentionally
 * mirror the real `DoctorAppointmentsController.getDoctorDashboardSummary`
 * definitions exactly (`consultationsToday` = still-pending bookings, i.e.
 * upcoming + in-progress, deliberately excluding completed ones; `completedToday`
 * = completed count; `patientsInQueue` = the seeded queue's real `waiting`
 * count below) so every number on the page agrees with every other one, the
 * same bar `countByStatusForDoctor` holds itself to server-side.
 */
const SEEDED_PATIENT_NAMES = [
  'Mona Farouk',
  'Ahmed El-Sayed',
  'Layla Ibrahim',
  'Youssef Hassan',
  'Nourhan Abdel Aziz',
  'Karim Mostafa',
  'Sara Zaki',
  'Omar Nabil',
  'Dina El-Masry',
  'Hassan Tawfik',
  'Mariam Adel',
  'Tarek Youssef',
] as const;

/** Minutes offset from "now" at seed time -> an ISO timestamp, same calendar day for any reasonable business-hours run. */
function offsetFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function seedSummary(): DoctorDashboardSummary {
  const work = seedUpcomingWork();
  return {
    consultationsToday: work.filter((item) => item.status === 'upcoming' || item.status === 'in-progress').length,
    patientsInQueue: seedQueue().filter((entry) => entry.status === 'waiting').length,
    completedToday: work.filter((item) => item.status === 'completed').length,
  };
}

function seedUpcomingWork(): UpcomingWorkItem[] {
  return [
    { id: 'upcoming-work-1', scheduledAt: offsetFromNow(-180), title: SEEDED_PATIENT_NAMES[0], description: 'Follow-up: hypertension management', status: 'completed' },
    { id: 'upcoming-work-2', scheduledAt: offsetFromNow(-150), title: SEEDED_PATIENT_NAMES[1], description: 'Annual physical exam', status: 'completed' },
    { id: 'upcoming-work-3', scheduledAt: offsetFromNow(-120), title: SEEDED_PATIENT_NAMES[2], description: 'Chest pain evaluation', status: 'completed' },
    { id: 'upcoming-work-4', scheduledAt: offsetFromNow(-90), title: SEEDED_PATIENT_NAMES[3], description: 'Diabetes management review', status: 'completed' },
    { id: 'upcoming-work-5', scheduledAt: offsetFromNow(-10), title: SEEDED_PATIENT_NAMES[4], description: 'Post-operative wound check', status: 'in-progress' },
    { id: 'upcoming-work-6', scheduledAt: offsetFromNow(20), title: SEEDED_PATIENT_NAMES[5], description: 'Persistent cough, two weeks', status: 'upcoming' },
    { id: 'upcoming-work-7', scheduledAt: offsetFromNow(50), title: SEEDED_PATIENT_NAMES[6], description: 'Routine medication review', status: 'upcoming' },
    { id: 'upcoming-work-8', scheduledAt: offsetFromNow(80), title: SEEDED_PATIENT_NAMES[7], description: 'Headache and dizziness', status: 'upcoming' },
    { id: 'upcoming-work-9', scheduledAt: offsetFromNow(140), title: SEEDED_PATIENT_NAMES[8], description: 'Prenatal check-up, 28 weeks', status: 'upcoming' },
    { id: 'upcoming-work-10', scheduledAt: offsetFromNow(170), title: SEEDED_PATIENT_NAMES[9], description: 'Lower back pain consultation', status: 'upcoming' },
    { id: 'upcoming-work-11', scheduledAt: offsetFromNow(200), title: SEEDED_PATIENT_NAMES[10], description: 'Seasonal allergy symptoms', status: 'cancelled' },
    { id: 'upcoming-work-12', scheduledAt: offsetFromNow(230), title: SEEDED_PATIENT_NAMES[11], description: 'Cardiac follow-up, post-stent', status: 'upcoming' },
  ];
}

/**
 * The doctor profile is administrative/professional data (name, specialty,
 * publications/awards, contact info) rather than clinical patient data, so —
 * unlike the summary/upcoming-work zero-states above — a believable seed is
 * appropriate here, matching `auth-store.ts`'s `doctor@orivex.dev` /
 * "Dr. Sarah Ahmed" mock account for continuity. This mock now exists purely
 * to keep the frontend test suite deterministic (`GET /doctors/me` is a real
 * backend endpoint, `mocks/handlers/doctor.ts` intercepts it in tests the
 * same way `mocks/handlers/patient.ts` mocks the also-real `/patients/me`
 * endpoint) — matches the real `DoctorProfileResponseDto` shape exactly: no
 * `qualifications`/`availability`, since neither exists on the backend.
 */
function seedProfile(): DoctorProfile {
  return {
    id: 'doctor-profile-1',
    accountId: 'user-doctor-1',
    fullName: 'Dr. Sarah Ahmed',
    email: 'doctor@orivex.dev',
    phoneNumber: '+20 100 000 0000',
    licenseNumber: 'LIC-2010-4471',
    specialtyId: 'specialty-cardiology',
    professionalRank: 'consultant',
    licenseExpiryDate: '2030-01-01T00:00:00.000Z',
    biography: 'Cardiologist with a focus on preventive care and long-term patient relationships.',
    yearsOfExperience: 12,
    languages: ['en', 'ar'],
    insuranceProviders: ['Misr Insurance', 'AXA', 'Allianz'],
    consultationFeeAmount: 450,
    publications: [
      { id: 'pub-1', title: 'Preventive Cardiology in Primary Care', reference: 'Egyptian Heart Journal, 2019' },
    ],
    awards: [{ id: 'award-1', title: 'Excellence in Patient Care', issuingBody: 'Cairo University Hospitals' }],
    workExperience: [
      {
        id: 'work-1',
        organizationName: 'Cairo University Hospitals',
        position: 'Consultant Cardiologist',
        professionalRank: 'consultant',
        startDate: '2021-03-01T00:00:00.000Z',
        description: 'Leads the preventive cardiology outpatient clinic and supervises resident training.',
      },
      {
        id: 'work-2',
        organizationName: 'Ain Shams University Hospital',
        position: 'Cardiology Registrar',
        professionalRank: 'registrar',
        startDate: '2015-09-01T00:00:00.000Z',
        endDate: '2021-02-28T00:00:00.000Z',
        description: 'Managed inpatient cardiology cases and coronary care unit rotations.',
      },
    ],
    createdAt: '2020-01-15T00:00:00.000Z',
    updatedAt: '2020-01-15T00:00:00.000Z',
  };
}

// Recurring weekly availability moved to `mocks/scheduling-store.ts`
// (Phase 9's `RecurringWeeklySchedule`) — availability is now owned by the
// Scheduling & Appointment Infrastructure, not Doctor.

/**
 * `GET /appointments/doctor/queue` is a real backend endpoint
 * (ConsultationModule's AppointmentController) composing today's
 * Confirmed/Completed appointments with their real ConsultationSession
 * state -- this mock now exists purely to keep the frontend test suite
 * deterministic, matching `seedSummary()`'s precedent.
 *
 * Dashboard visual-QA pass (2026-08): five patients checked in for today's
 * busy-practice seed (`seedUpcomingWork()` above) -- the one whose
 * appointment is `in-progress` there is `in-consultation` here (the same
 * patient, not a coincidence), and the next four `upcoming` patients are
 * `waiting`, deliberately kept internally consistent rather than a separate
 * invented roster.
 */
function seedQueue(): QueueEntry[] {
  return [
    { id: 'queue-1', label: SEEDED_PATIENT_NAMES[4], status: 'in-consultation', position: 0 },
    { id: 'queue-2', label: SEEDED_PATIENT_NAMES[5], status: 'waiting', position: 1, estimatedWaitMinutes: 5 },
    { id: 'queue-3', label: SEEDED_PATIENT_NAMES[6], status: 'waiting', position: 2, estimatedWaitMinutes: 18 },
    { id: 'queue-4', label: SEEDED_PATIENT_NAMES[7], status: 'waiting', position: 3, estimatedWaitMinutes: 32 },
    { id: 'queue-5', label: SEEDED_PATIENT_NAMES[8], status: 'waiting', position: 4, estimatedWaitMinutes: 47 },
  ];
}

/**
 * Doctor Workspace dashboard redesign's Patients/Reports pages.
 *
 * Dashboard visual-QA pass (2026-08): the same busy-practice seed as
 * `seedUpcomingWork()`/`seedQueue()` above, extended into a plausible
 * distinct-patient roster -- every seeded schedule/queue name appears here,
 * `visitCount`/`lastVisitAt` never contradicting today's schedule (a
 * patient whose appointment already completed today has `lastVisitAt` set
 * to that same today timestamp; a patient whose appointment is still
 * upcoming/in-progress or was cancelled today has `lastVisitAt` pointing at
 * a real *prior* encounter instead, since today's visit hasn't happened
 * yet).
 */
function seedPatients(): DoctorPatientListItem[] {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const work = seedUpcomingWork();
  return [
    { patientProfileId: 'patient-1', patientName: SEEDED_PATIENT_NAMES[0], visitCount: 6, lastVisitAt: work[0].scheduledAt, lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-2', patientName: SEEDED_PATIENT_NAMES[1], visitCount: 3, lastVisitAt: work[1].scheduledAt, lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-3', patientName: SEEDED_PATIENT_NAMES[2], visitCount: 9, lastVisitAt: work[2].scheduledAt, lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-4', patientName: SEEDED_PATIENT_NAMES[3], visitCount: 2, lastVisitAt: work[3].scheduledAt, lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-5', patientName: SEEDED_PATIENT_NAMES[4], visitCount: 5, lastVisitAt: daysAgo(18), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-6', patientName: SEEDED_PATIENT_NAMES[5], visitCount: 2, lastVisitAt: daysAgo(32), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-7', patientName: SEEDED_PATIENT_NAMES[6], visitCount: 4, lastVisitAt: daysAgo(10), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-8', patientName: SEEDED_PATIENT_NAMES[7], visitCount: 1, lastVisitAt: daysAgo(60), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-9', patientName: SEEDED_PATIENT_NAMES[8], visitCount: 7, lastVisitAt: daysAgo(14), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-10', patientName: SEEDED_PATIENT_NAMES[9], visitCount: 3, lastVisitAt: daysAgo(25), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-11', patientName: SEEDED_PATIENT_NAMES[10], visitCount: 4, lastVisitAt: daysAgo(40), lastVisitStatus: 'completed' },
    { patientProfileId: 'patient-12', patientName: SEEDED_PATIENT_NAMES[11], visitCount: 6, lastVisitAt: daysAgo(7), lastVisitStatus: 'completed' },
  ];
}

/**
 * Dashboard visual-QA pass (2026-08): a believable all-time aggregate for a
 * busy consultant, not scoped to just today's schedule above (this mirrors
 * the real `GetDoctorReportsSummaryUseCase`'s own all-time aggregate, not a
 * daily one) -- `totalAppointments` is kept honestly equal to the sum of the
 * four status counts, never a disagreeing round number.
 */
function seedReportsSummary(): DoctorReportsSummary {
  const confirmed = 6;
  const completed = 47;
  const cancelled = 5;
  const noShow = 3;
  return {
    totalAppointments: confirmed + completed + cancelled + noShow,
    confirmed,
    completed,
    cancelled,
    noShow,
    averageRating: 4.6,
    reviewCount: 41,
  };
}

let summary: DoctorDashboardSummary = seedSummary();
let upcomingWork: UpcomingWorkItem[] = seedUpcomingWork();
let profile: DoctorProfile = seedProfile();
let queue: QueueEntry[] = seedQueue();
let patients: DoctorPatientListItem[] = seedPatients();
let reportsSummary: DoctorReportsSummary = seedReportsSummary();

export function getDashboardSummary(): DoctorDashboardSummary {
  return summary;
}

export function getUpcomingWork(): UpcomingWorkItem[] {
  return upcomingWork;
}

export function getProfile(): DoctorProfile {
  return profile;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5) -- the public GET /doctors/:id lookup. */
export function getDoctorById(doctorProfileId: string): DoctorProfile | null {
  return profile.id === doctorProfileId ? profile : null;
}

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
// SuperAdmin-only GET /doctors/by-account/:accountId lookup -- backs the
// verification case-detail page's Doctor-specific context section (a
// VerificationCase only stores subjectAccountId, never a doctorProfileId).
export function getDoctorByAccountId(accountId: string): DoctorProfile | null {
  return profile.accountId === accountId ? profile : null;
}

// Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Browse/Search
// Doctors screen's data source -- a single-entry "directory" (the one
// seeded demo doctor), honest given this mock's own single-profile store.
function toDirectoryEntry(doctorProfile: DoctorProfile): DoctorDirectoryEntry {
  return {
    doctorProfileId: doctorProfile.id,
    accountId: doctorProfile.accountId,
    displayName: doctorProfile.fullName,
    specialtyId: doctorProfile.specialtyId,
    yearsOfExperience: doctorProfile.yearsOfExperience,
    consultationFeeAmount: doctorProfile.consultationFeeAmount,
    hospitalId: doctorProfile.hospitalId,
  };
}

export function listDoctors(params: ListDoctorDirectoryParams): { doctors: DoctorDirectoryEntry[]; total: number; page: number; limit: number } {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  // Onboarding Redesign (2026-07-21 proposal, Stage O.9): the free-text
  // `specialty` filter now matches against the referenced MedicalSpecialty's
  // name, mirroring the real backend's relation-filter -- DoctorProfile no
  // longer carries its own free-text copy.
  const specialtyName = listSpecialties().find((specialty) => specialty.id === profile.specialtyId)?.name ?? '';
  const matches = !params.specialty || specialtyName.toLowerCase().includes(params.specialty.toLowerCase())
    ? [toDirectoryEntry(profile)]
    : [];
  return { doctors: matches, total: matches.length, page, limit };
}

export function registerProfile(request: RegisterDoctorProfileRequest): DoctorProfile {
  profile = {
    id: 'doctor-profile-1',
    accountId: 'user-doctor-1',
    fullName: 'Dr. Sarah Ahmed',
    email: 'doctor@orivex.dev',
    phoneNumber: '+20 100 000 0000',
    licenseNumber: request.licenseNumber,
    specialtyId: request.specialtyId,
    professionalRank: request.professionalRank,
    licenseExpiryDate: request.licenseExpiryDate,
    biography: request.biography,
    yearsOfExperience: request.yearsOfExperience,
    languages: request.languages ?? [],
    insuranceProviders: request.insuranceProviders ?? [],
    consultationFeeAmount: request.consultationFeeAmount,
    hospitalId: request.hospitalId,
    departmentId: request.departmentId,
    publications: [],
    awards: [],
    workExperience:
      request.workExperience?.map((entry, index) => ({
        id: `work-${Date.now()}-${index}`,
        organizationName: entry.organizationName,
        position: entry.position,
        professionalRank: entry.professionalRank,
        startDate: entry.startDate,
        endDate: entry.endDate,
        description: entry.description,
      })) ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return profile;
}

export function updateProfile(request: DoctorProfileUpdateRequest): DoctorProfile {
  profile = {
    ...profile,
    specialtyId: request.specialtyId ?? profile.specialtyId,
    professionalRank: request.professionalRank ?? profile.professionalRank,
    licenseExpiryDate: request.licenseExpiryDate ?? profile.licenseExpiryDate,
    biography: request.biography ?? profile.biography,
    yearsOfExperience: request.yearsOfExperience ?? profile.yearsOfExperience,
    languages: request.languages ?? profile.languages,
    insuranceProviders: request.insuranceProviders ?? profile.insuranceProviders,
    consultationFeeAmount: request.consultationFeeAmount ?? profile.consultationFeeAmount,
    hospitalId: request.hospitalId ?? profile.hospitalId,
    departmentId: request.departmentId ?? profile.departmentId,
    publications:
      request.publications?.map((publication, index) => ({
        id: `pub-${Date.now()}-${index}`,
        title: publication.title,
        reference: publication.reference,
      })) ?? profile.publications,
    awards:
      request.awards?.map((award, index) => ({
        id: `award-${Date.now()}-${index}`,
        title: award.title,
        issuingBody: award.issuingBody,
      })) ?? profile.awards,
    workExperience:
      request.workExperience?.map((entry, index) => ({
        id: `work-${Date.now()}-${index}`,
        organizationName: entry.organizationName,
        position: entry.position,
        professionalRank: entry.professionalRank,
        startDate: entry.startDate,
        endDate: entry.endDate,
        description: entry.description,
      })) ?? profile.workExperience,
    updatedAt: new Date().toISOString(),
  };
  return profile;
}

export function getQueue(): QueueEntry[] {
  return queue;
}

export function getPatients(): DoctorPatientListItem[] {
  return patients;
}

export function getReportsSummary(): DoctorReportsSummary {
  return reportsSummary;
}

/**
 * Test-only seam: places a real ConsultationSession's id "in consultation"
 * on the doctor's queue, letting an E2E spec drive the real
 * `ConsultationWorkspaceAction`/`JoinCallAction` UI against it without a
 * real LiveKit connection (see `mock-provider.tsx`'s own doc comment for why
 * that's the one genuinely unexercisable slice). Never called from
 * application code.
 */
export function seedInConsultationQueueEntry(consultationSessionId: string, label: string): void {
  queue = [...queue, { id: consultationSessionId, label, status: 'in-consultation', position: 0 }];
}

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
// delegates to the shared, cross-store `verification-case-store.ts` --
// `doctorId` (the profile id) is unused beyond keeping this function's
// existing call-site signature, since the real subject key is
// `profile.accountId` (this mock only ever seeds one doctor profile).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match doctorApi.getVerifications' real shape
export function listVerifications(doctorId: string): VerificationCase[] {
  return findAllVerificationCasesBySubject('doctor', profile.accountId);
}

export function submitVerification(_doctorId: string, request: SubmitVerificationRequest): VerificationCase {
  return submitVerificationCase({
    subjectAccountId: profile.accountId,
    subjectType: 'doctor',
    licenseNumber: request.licenseNumber,
    specialtyCode: request.specialtyCode,
    documentAssetIds: request.documentAssetIds,
  });
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetDoctorStore(): void {
  summary = seedSummary();
  upcomingWork = seedUpcomingWork();
  profile = seedProfile();
  queue = seedQueue();
  patients = seedPatients();
  reportsSummary = seedReportsSummary();
  setSubjectVerificationCases('doctor', profile.accountId, []);
}
