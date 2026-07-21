import type {
  DoctorDashboardSummary,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  QueueEntry,
  RegisterDoctorProfileRequest,
  SubmitVerificationRequest,
  UpcomingWorkItem,
  VerificationCase,
} from '@/features/doctor/api/types';

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
    accountId: 'doctor-account-1',
    fullName: 'Dr. Sarah Ahmed',
    email: 'doctor@orivex.dev',
    phoneNumber: '+20 100 000 0000',
    licenseNumber: 'LIC-2010-4471',
    specialty: 'Cardiology',
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
// Doctor Onboarding (Phase 4 continuation): keyed by doctorProfileId, most
// recently submitted first -- an honest empty array by default (the seeded
// `doctor@orivex.dev` account is a fully-provisioned demo doctor, not an
// onboarding applicant).
let verificationsByDoctorId: Record<string, VerificationCase[]> = {};

export function getDashboardSummary(): DoctorDashboardSummary {
  return summary;
}

export function getUpcomingWork(): UpcomingWorkItem[] {
  return upcomingWork;
}

export function getProfile(): DoctorProfile {
  return profile;
}

export function registerProfile(request: RegisterDoctorProfileRequest): DoctorProfile {
  profile = {
    id: 'doctor-profile-1',
    accountId: 'doctor-account-1',
    fullName: 'Dr. Sarah Ahmed',
    email: 'doctor@orivex.dev',
    phoneNumber: '+20 100 000 0000',
    licenseNumber: request.licenseNumber,
    specialty: request.specialty,
    biography: request.biography,
    yearsOfExperience: request.yearsOfExperience,
    languages: request.languages ?? [],
    consultationFeeAmount: request.consultationFeeAmount,
    hospitalId: request.hospitalId,
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
    specialty: request.specialty ?? profile.specialty,
    biography: request.biography ?? profile.biography,
    yearsOfExperience: request.yearsOfExperience ?? profile.yearsOfExperience,
    languages: request.languages ?? profile.languages,
    consultationFeeAmount: request.consultationFeeAmount ?? profile.consultationFeeAmount,
    hospitalId: request.hospitalId ?? profile.hospitalId,
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

export function listVerifications(doctorId: string): VerificationCase[] {
  return verificationsByDoctorId[doctorId] ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must match doctorApi.submitVerification's real shape
export function submitVerification(doctorId: string, request: SubmitVerificationRequest): VerificationCase {
  const created: VerificationCase = {
    id: `verification-${Date.now()}`,
    doctorId,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    decidedAt: null,
  };
  verificationsByDoctorId[doctorId] = [created, ...(verificationsByDoctorId[doctorId] ?? [])];
  return created;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetDoctorStore(): void {
  summary = seedSummary();
  upcomingWork = seedUpcomingWork();
  profile = seedProfile();
  queue = seedQueue();
  verificationsByDoctorId = {};
}
