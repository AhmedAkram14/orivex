import type {
  DoctorDashboardSummary,
  DoctorDirectoryEntry,
  DoctorProfile,
  DoctorProfileUpdateRequest,
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
 * `patient-store.ts`'s `seedAppointments()` precedent. An honest empty
 * reality: the seeded test doctor account has never had a real appointment
 * booked against it, so the summary counts and upcoming-work list reflect
 * "nothing scheduled yet," never invented clinical data.
 */
function seedSummary(): DoctorDashboardSummary {
  return { consultationsToday: 0, patientsInQueue: 0, completedToday: 0 };
}

function seedUpcomingWork(): UpcomingWorkItem[] {
  return [];
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
    consultationFeeAmount: 450,
    publications: [
      { id: 'pub-1', title: 'Preventive Cardiology in Primary Care', reference: 'Egyptian Heart Journal, 2019' },
    ],
    awards: [{ id: 'award-1', title: 'Excellence in Patient Care', issuingBody: 'Cairo University Hospitals' }],
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
 * deterministic, matching `seedSummary()`'s precedent. An honest empty
 * array: the seeded test doctor account has no appointments today.
 */
function seedQueue(): QueueEntry[] {
  return [];
}

let summary: DoctorDashboardSummary = seedSummary();
let upcomingWork: UpcomingWorkItem[] = seedUpcomingWork();
let profile: DoctorProfile = seedProfile();
let queue: QueueEntry[] = seedQueue();

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
    consultationFeeAmount: request.consultationFeeAmount,
    hospitalId: request.hospitalId,
    departmentId: request.departmentId,
    publications: [],
    awards: [],
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
    updatedAt: new Date().toISOString(),
  };
  return profile;
}

export function getQueue(): QueueEntry[] {
  return queue;
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
  setSubjectVerificationCases('doctor', profile.accountId, []);
}
