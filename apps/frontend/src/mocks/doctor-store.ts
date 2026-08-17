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
  decideVerificationCase,
  findAllVerificationCasesBySubject,
  setSubjectVerificationCases,
  submitVerificationCase,
} from '@/mocks/verification-case-store';
import { findSpecialtyIdByName, listSpecialties } from '@/mocks/reference-store';
import { findAccountById, getCurrentAccountId, LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';
import { DEMO_SEED_ENABLED } from '@/mocks/demo-mode';
import { DEMO_DOCTORS, type DemoDoctor } from '@/mocks/demo-data/demo-people';

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

/**
 * Minutes offset from "now" at seed time -> an ISO timestamp. Snapped onto
 * today's actual calendar date whenever the raw offset would have wrapped
 * across a midnight boundary (e.g. "3 hours ago" computed at 01:00 lands on
 * *yesterday* otherwise) -- `TodaysSchedule`'s real same-calendar-day filter
 * would silently drop that item, which is exactly what happened: this seed
 * flaked right around midnight before this guard existed. Keeps the same
 * time-of-day, just forces the date part onto today, so every seeded item
 * survives the real "today" filter no matter what wall-clock time the dev
 * server or test suite actually runs at.
 */
function offsetFromNow(minutes: number): string {
  const target = new Date(Date.now() + minutes * 60_000);
  const now = new Date();
  if (
    target.getFullYear() !== now.getFullYear() ||
    target.getMonth() !== now.getMonth() ||
    target.getDate() !== now.getDate()
  ) {
    target.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return target.toISOString();
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
    accountId: LEGACY_DOCTOR_ACCOUNT_ID,
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
function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
}

function seedPatients(): DoctorPatientListItem[] {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const work = seedUpcomingWork();
  const base = [
    { patientProfileId: 'patient-1', patientName: SEEDED_PATIENT_NAMES[0], visitCount: 6, lastVisitAt: work[0].scheduledAt, lastVisitStatus: 'completed' as const, nextAppointmentAt: daysFromNow(11) },
    { patientProfileId: 'patient-2', patientName: SEEDED_PATIENT_NAMES[1], visitCount: 3, lastVisitAt: work[1].scheduledAt, lastVisitStatus: 'completed' as const, nextAppointmentAt: daysFromNow(7) },
    { patientProfileId: 'patient-3', patientName: SEEDED_PATIENT_NAMES[2], visitCount: 9, lastVisitAt: work[2].scheduledAt, lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-4', patientName: SEEDED_PATIENT_NAMES[3], visitCount: 2, lastVisitAt: work[3].scheduledAt, lastVisitStatus: 'completed' as const },
    // Seeded with a real (mocked) follow-up recommendation, no upcoming
    // appointment booked yet -- exercises the "Follow up" status.
    { patientProfileId: 'patient-5', patientName: SEEDED_PATIENT_NAMES[4], visitCount: 5, lastVisitAt: daysAgo(18), lastVisitStatus: 'completed' as const, hasFollowUpRecommendation: true },
    { patientProfileId: 'patient-6', patientName: SEEDED_PATIENT_NAMES[5], visitCount: 2, lastVisitAt: daysAgo(32), lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-7', patientName: SEEDED_PATIENT_NAMES[6], visitCount: 4, lastVisitAt: daysAgo(10), lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-8', patientName: SEEDED_PATIENT_NAMES[7], visitCount: 1, lastVisitAt: daysAgo(120), lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-9', patientName: SEEDED_PATIENT_NAMES[8], visitCount: 7, lastVisitAt: daysAgo(14), lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-10', patientName: SEEDED_PATIENT_NAMES[9], visitCount: 3, lastVisitAt: daysAgo(25), lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-11', patientName: SEEDED_PATIENT_NAMES[10], visitCount: 4, lastVisitAt: daysAgo(40), lastVisitStatus: 'completed' as const },
    { patientProfileId: 'patient-12', patientName: SEEDED_PATIENT_NAMES[11], visitCount: 6, lastVisitAt: daysAgo(7), lastVisitStatus: 'completed' as const },
  ];
  const genders: Array<'male' | 'female'> = ['male', 'female'];
  return base.map((patient, index) => ({
    ...patient,
    email: emailFor(patient.patientName),
    phoneNumber: `+20 10${(index + 1).toString().padStart(2, '0')} 000 0000`,
    dateOfBirth: new Date(1975 + index * 3, index % 12, 10).toISOString(),
    gender: genders[index % genders.length],
    hasFollowUpRecommendation: (patient as { hasFollowUpRecommendation?: boolean }).hasFollowUpRecommendation ?? false,
  }));
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

/**
 * Demo Data & Profile Avatar Pass -- the root fix for this store's original
 * architectural limitation: every piece of doctor state below used to be a
 * single module-level singleton, so switching which mock doctor was logged
 * in never changed a thing (every doctor saw "Dr. Sarah Ahmed"). Each is now
 * a `Map` keyed by the owning *account* id, seeded for every demo doctor in
 * `demo-people.ts` plus the legacy `doctor@orivex.dev` persona, and every
 * read/write below resolves the caller's own account first.
 *
 * Account resolution order (see `request-account.ts`): the intercepted
 * request's own bearer token -> the mock session marker -> the legacy demo
 * doctor. That last fallback is what keeps every existing component test
 * working: those render a page without ever driving a login, so there is no
 * token and no session, and they correctly keep seeing the exact fixture
 * they always did.
 */
function resolveAccountId(accountId?: string): string {
  return accountId ?? getCurrentAccountId() ?? LEGACY_DOCTOR_ACCOUNT_ID;
}

/**
 * A demo doctor's `DoctorProfile`, built from `demo-people.ts`'s own values.
 * `languages` are stored as the same ISO codes the legacy profile uses (the
 * UI resolves those to display names), never the English label. No
 * `hospitalId`: this mock system has no hospital directory to point at, so
 * an affiliation is left genuinely unset rather than invented (the field is
 * optional, and the public directory already renders "Independent Practice"
 * for it).
 */
const LANGUAGE_CODES: Record<string, string> = { Arabic: 'ar', English: 'en', French: 'fr' };

function demoDoctorProfile(doctor: DemoDoctor, index: number): DoctorProfile {
  const seniority = doctor.professionalRank === 'professor' || doctor.professionalRank === 'consultant';
  const startYear = new Date().getFullYear() - doctor.yearsOfExperience;
  return {
    id: `doctor-profile-demo-${index + 1}`,
    accountId: doctor.accountId,
    fullName: doctor.displayName,
    email: doctor.email,
    phoneNumber: `+20 12${(index + 10).toString().padStart(2, '0')} ${(index + 1).toString().padStart(3, '0')} 4400`,
    avatarUrl: doctor.avatarUrl,
    licenseNumber: `LIC-${startYear}-${(4000 + index * 37).toString()}`,
    specialtyId: findSpecialtyIdByName(doctor.specialtyName) ?? 'specialty-cardiology',
    professionalRank: doctor.professionalRank,
    licenseExpiryDate: `${new Date().getFullYear() + 3 + (index % 4)}-06-30T00:00:00.000Z`,
    biography: doctor.biography,
    yearsOfExperience: doctor.yearsOfExperience,
    languages: doctor.languages.map((language) => LANGUAGE_CODES[language] ?? language.toLowerCase()),
    insuranceProviders: doctor.insuranceProviders,
    consultationFeeAmount: doctor.consultationFeeAmount,
    publications: seniority
      ? [{ id: `pub-demo-${index + 1}`, title: `Clinical outcomes in ${doctor.specialtyName.toLowerCase()} outpatient care`, reference: `Egyptian Medical Journal, ${startYear + Math.floor(doctor.yearsOfExperience / 2)}` }]
      : [],
    awards: seniority
      ? [{ id: `award-demo-${index + 1}`, title: 'Excellence in Patient Care', issuingBody: doctor.hospitalName ?? 'Egyptian Medical Syndicate' }]
      : [],
    workExperience: [
      {
        id: `work-demo-${index + 1}`,
        organizationName: doctor.hospitalName ?? 'Private Practice',
        position: `${doctor.professionalRank.charAt(0).toUpperCase()}${doctor.professionalRank.slice(1)} ${doctor.specialtyName}`,
        professionalRank: doctor.professionalRank,
        startDate: `${startYear + Math.floor(doctor.yearsOfExperience / 2)}-01-01T00:00:00.000Z`,
        description: doctor.biography,
      },
    ],
    createdAt: `${startYear}-01-15T00:00:00.000Z`,
    updatedAt: new Date().toISOString(),
  };
}

function seedProfilesByAccountId(): Map<string, DoctorProfile> {
  const seeded = new Map<string, DoctorProfile>();
  const legacy = seedProfile();
  seeded.set(legacy.accountId, legacy);
  if (DEMO_SEED_ENABLED) {
    DEMO_DOCTORS.forEach((doctor, index) => seeded.set(doctor.accountId, demoDoctorProfile(doctor, index)));
  }
  return seeded;
}

let profilesByAccountId: Map<string, DoctorProfile> = seedProfilesByAccountId();
// Per-account operational state. Only ever written for accounts that have
// genuinely diverged from the shared seed (a doctor whose day is generated
// below, or a legacy-fixture override); an account with no entry reads the
// same seed as before, which is exactly the pre-existing behavior.
const summaryByAccountId = new Map<string, DoctorDashboardSummary>();
const upcomingWorkByAccountId = new Map<string, UpcomingWorkItem[]>();
const queueByAccountId = new Map<string, QueueEntry[]>();
const patientsByAccountId = new Map<string, DoctorPatientListItem[]>();
const reportsSummaryByAccountId = new Map<string, DoctorReportsSummary>();

export function getDashboardSummary(accountId?: string): DoctorDashboardSummary {
  return summaryByAccountId.get(resolveAccountId(accountId)) ?? seedSummary();
}

export function getUpcomingWork(accountId?: string): UpcomingWorkItem[] {
  return upcomingWorkByAccountId.get(resolveAccountId(accountId)) ?? seedUpcomingWork();
}

/** `undefined` when the caller's account has no doctor profile (e.g. a patient hitting `/doctors/me`) -- the handler maps that to the real backend's own 404. */
export function getProfile(accountId?: string): DoctorProfile | undefined {
  return profilesByAccountId.get(resolveAccountId(accountId));
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5) -- the public GET /doctors/:id lookup. */
export function getDoctorById(doctorProfileId: string): DoctorProfile | null {
  for (const candidate of profilesByAccountId.values()) {
    if (candidate.id === doctorProfileId) return candidate;
  }
  return null;
}

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
// SuperAdmin-only GET /doctors/by-account/:accountId lookup -- backs the
// verification case-detail page's Doctor-specific context section (a
// VerificationCase only stores subjectAccountId, never a doctorProfileId).
export function getDoctorByAccountId(accountId: string): DoctorProfile | null {
  return profilesByAccountId.get(accountId) ?? null;
}

/** Demo Data & Profile Avatar Pass: every seeded doctor, for the cross-store demo seeders (scheduling windows, ratings, appointments). */
export function listAllDoctorProfiles(): DoctorProfile[] {
  return [...profilesByAccountId.values()];
}

/** Demo Data & Profile Avatar Pass: lets the demo seeders give each doctor their own generated day/roster/aggregate instead of the one shared fixture. */
export function setDoctorOperationalState(
  accountId: string,
  state: {
    summary?: DoctorDashboardSummary;
    upcomingWork?: UpcomingWorkItem[];
    queue?: QueueEntry[];
    patients?: DoctorPatientListItem[];
    reportsSummary?: DoctorReportsSummary;
  },
): void {
  if (state.summary) summaryByAccountId.set(accountId, state.summary);
  if (state.upcomingWork) upcomingWorkByAccountId.set(accountId, state.upcomingWork);
  if (state.queue) queueByAccountId.set(accountId, state.queue);
  if (state.patients) patientsByAccountId.set(accountId, state.patients);
  if (state.reportsSummary) reportsSummaryByAccountId.set(accountId, state.reportsSummary);
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
    avatarUrl: doctorProfile.avatarUrl,
  };
}

export function listDoctors(params: ListDoctorDirectoryParams): { doctors: DoctorDirectoryEntry[]; total: number; page: number; limit: number } {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const specialtyNamesById = new Map(listSpecialties().map((specialty) => [specialty.id, specialty.name]));
  // Onboarding Redesign (2026-07-21 proposal, Stage O.9): the free-text
  // `specialty` filter matches against the referenced MedicalSpecialty's
  // name, mirroring the real backend's relation-filter -- DoctorProfile no
  // longer carries its own free-text copy. `specialtyId`/`hospitalId` are
  // exact-match filters, same as the real ListDoctorDirectoryQueryDto.
  const matches = listAllDoctorProfiles().filter((candidate) => {
    if (params.specialtyId && candidate.specialtyId !== params.specialtyId) return false;
    if (params.hospitalId && candidate.hospitalId !== params.hospitalId) return false;
    if (params.specialty) {
      const specialtyName = specialtyNamesById.get(candidate.specialtyId) ?? '';
      if (!specialtyName.toLowerCase().includes(params.specialty.toLowerCase())) return false;
    }
    return true;
  });
  const offset = (page - 1) * limit;
  return {
    doctors: matches.slice(offset, offset + limit).map(toDirectoryEntry),
    total: matches.length,
    page,
    limit,
  };
}

export function registerProfile(request: RegisterDoctorProfileRequest, accountId?: string): DoctorProfile {
  const owner = resolveAccountId(accountId);
  const existing = profilesByAccountId.get(owner);
  // The owning Account composes fullName/email/avatar on the real backend
  // too (DoctorProfileResponseDto), so they come from `auth-store.ts` here
  // rather than being invented -- an already-seeded profile keeps its own.
  const account = findAccountById(owner);
  const profile: DoctorProfile = {
    id: existing?.id ?? `doctor-profile-${owner}`,
    accountId: owner,
    fullName: existing?.fullName ?? account?.fullName ?? 'Dr. Sarah Ahmed',
    email: existing?.email ?? account?.email ?? 'doctor@orivex.dev',
    phoneNumber: existing?.phoneNumber ?? '+20 100 000 0000',
    avatarUrl: existing?.avatarUrl ?? account?.avatarUrl,
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
  profilesByAccountId.set(owner, profile);
  return profile;
}

export function updateProfile(request: DoctorProfileUpdateRequest, accountId?: string): DoctorProfile | undefined {
  const owner = resolveAccountId(accountId);
  const profile = profilesByAccountId.get(owner);
  if (!profile) return undefined;
  const updated: DoctorProfile = {
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
  profilesByAccountId.set(owner, updated);
  return updated;
}

export function getQueue(accountId?: string): QueueEntry[] {
  return queueByAccountId.get(resolveAccountId(accountId)) ?? seedQueue();
}

export function getPatients(accountId?: string): DoctorPatientListItem[] {
  return patientsByAccountId.get(resolveAccountId(accountId)) ?? seedPatients();
}

export function getReportsSummary(accountId?: string): DoctorReportsSummary {
  return reportsSummaryByAccountId.get(resolveAccountId(accountId)) ?? seedReportsSummary();
}

/**
 * Test-only seam: places a real ConsultationSession's id "in consultation"
 * on the doctor's queue, letting an E2E spec drive the real
 * `ConsultationWorkspaceAction`/`JoinCallAction` UI against it without a
 * real LiveKit connection (see `mock-provider.tsx`'s own doc comment for why
 * that's the one genuinely unexercisable slice). Never called from
 * application code.
 */
export function seedInConsultationQueueEntry(consultationSessionId: string, label: string, accountId?: string): void {
  const owner = resolveAccountId(accountId);
  const current = queueByAccountId.get(owner) ?? seedQueue();
  queueByAccountId.set(owner, [...current, { id: consultationSessionId, label, status: 'in-consultation', position: 0 }]);
}

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
// delegates to the shared, cross-store `verification-case-store.ts`. The
// real subject key is the owning *account* id, so `doctorId` (a profile id)
// is resolved back to its owner where it names a real seeded profile,
// falling back to the caller's own account otherwise -- both paths land on
// the same account for a doctor submitting their own case.
function verificationSubjectAccountId(doctorId: string, accountId?: string): string {
  return getDoctorById(doctorId)?.accountId ?? resolveAccountId(accountId);
}

export function listVerifications(doctorId: string, accountId?: string): VerificationCase[] {
  return findAllVerificationCasesBySubject('doctor', verificationSubjectAccountId(doctorId, accountId));
}

export function submitVerification(doctorId: string, request: SubmitVerificationRequest, accountId?: string): VerificationCase {
  return submitVerificationCase({
    subjectAccountId: verificationSubjectAccountId(doctorId, accountId),
    subjectType: 'doctor',
    licenseNumber: request.licenseNumber,
    specialtyCode: request.specialtyCode,
    documentAssetIds: request.documentAssetIds,
  });
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetDoctorStore(): void {
  const previousAccountIds = [...profilesByAccountId.keys()];
  summaryByAccountId.clear();
  upcomingWorkByAccountId.clear();
  queueByAccountId.clear();
  patientsByAccountId.clear();
  reportsSummaryByAccountId.clear();
  profilesByAccountId = seedProfilesByAccountId();
  // Clears every doctor subject this store has ever owned (not just the
  // legacy one), leaving other subject types untouched -- same
  // only-reset-my-own-slice contract this function always held.
  for (const accountId of new Set([...previousAccountIds, ...profilesByAccountId.keys()])) {
    setSubjectVerificationCases('doctor', accountId, []);
  }
  seedDemoVerificationCases();
}

/**
 * Demo Data & Profile Avatar Pass: mirrors each demo doctor's own
 * `verification` field into the shared `verification-case-store.ts` -- the
 * same store the admin verification queue reads, so the demo's approved/
 * pending/rejected spread is real state an admin can actually act on, not a
 * display-only flag.
 */
function seedDemoVerificationCases(): void {
  if (!DEMO_SEED_ENABLED) return;
  DEMO_DOCTORS.forEach((doctor) => {
    const submitted = submitVerificationCase({
      subjectAccountId: doctor.accountId,
      subjectType: 'doctor',
      licenseNumber: profilesByAccountId.get(doctor.accountId)?.licenseNumber,
      specialtyCode: doctor.specialtyName.toLowerCase().replace(/[^a-z]+/g, '-'),
      documentAssetIds: ['seed-national-id-front', 'seed-national-id-back', 'seed-selfie-with-id'],
    });
    // A 'pending' demo doctor deliberately stays `submitted` -- that's what
    // puts them in the admin's real pending-review queue.
    if (doctor.verification === 'approved') {
      decideVerificationCase(submitted.id, 'approved');
    } else if (doctor.verification === 'rejected') {
      decideVerificationCase(submitted.id, 'rejected', 'License documentation was unreadable; please re-upload a clearer scan.');
    }
  });
}

seedDemoVerificationCases();
