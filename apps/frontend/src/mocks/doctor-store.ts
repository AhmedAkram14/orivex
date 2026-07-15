import type {
  DoctorDashboardSummary,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  UpcomingWorkItem,
} from '@/features/doctor/api/types';

/**
 * In-memory mock "backend" state for `/doctor/*` — mirrors
 * `notifications-store.ts`'s pattern. Deliberately an honest zero/empty
 * reality: no Appointment/Consultation module exists yet (this phase's
 * explicit scope), so the summary counts and upcoming-work list reflect
 * "nothing scheduled yet," never invented clinical data.
 */
function seedSummary(): DoctorDashboardSummary {
  return { consultationsToday: 0, patientsInQueue: 0, completedToday: 0 };
}

function seedUpcomingWork(): UpcomingWorkItem[] {
  return [];
}

/**
 * The doctor profile is administrative/professional data (name,
 * specialization, qualifications, contact info) rather than clinical
 * patient data, so — unlike the summary/upcoming-work zero-states above —
 * a believable seed is appropriate here, matching `auth-store.ts`'s
 * `doctor@orivex.dev` / "Dr. Sarah Ahmed" mock account for continuity.
 */
function seedProfile(): DoctorProfile {
  return {
    id: 'doctor-profile-1',
    fullName: 'Dr. Sarah Ahmed',
    specialization: 'Cardiology',
    bio: 'Cardiologist with a focus on preventive care and long-term patient relationships.',
    qualifications: [
      { id: 'qual-1', title: 'MD, Cairo University', year: 2010 },
      { id: 'qual-2', title: 'Board Certified in Cardiology', year: 2014 },
    ],
    yearsOfExperience: 12,
    languages: ['en', 'ar'],
    email: 'doctor@orivex.dev',
    phone: '+20 100 000 0000',
    availability: {
      daysAvailable: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      hoursLabel: '9:00 AM – 5:00 PM',
    },
  };
}

let summary: DoctorDashboardSummary = seedSummary();
let upcomingWork: UpcomingWorkItem[] = seedUpcomingWork();
let profile: DoctorProfile = seedProfile();

export function getDashboardSummary(): DoctorDashboardSummary {
  return summary;
}

export function getUpcomingWork(): UpcomingWorkItem[] {
  return upcomingWork;
}

export function getProfile(): DoctorProfile {
  return profile;
}

export function updateProfile(request: DoctorProfileUpdateRequest): DoctorProfile {
  profile = { ...profile, ...request };
  return profile;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetDoctorStore(): void {
  summary = seedSummary();
  upcomingWork = seedUpcomingWork();
  profile = seedProfile();
}
