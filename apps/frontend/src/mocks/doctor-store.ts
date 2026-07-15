import type {
  AvailabilityBlockData,
  DoctorDashboardSummary,
  DoctorProfile,
  DoctorProfileUpdateRequest,
  QueueEntry,
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

/** Mirrors `seedProfile`'s `availability` summary (Sun–Thu, 9–5) as discrete per-day blocks — the Schedule Foundation's data shape, same underlying reality as the profile page's plain-text summary. */
function seedAvailability(): AvailabilityBlockData[] {
  const days: AvailabilityBlockData['dayOfWeek'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  return days.map((day, index) => ({ id: `availability-${index}`, dayOfWeek: day, startHour: 9, endHour: 17 }));
}

function seedQueue(): QueueEntry[] {
  return [];
}

let summary: DoctorDashboardSummary = seedSummary();
let upcomingWork: UpcomingWorkItem[] = seedUpcomingWork();
let profile: DoctorProfile = seedProfile();
let availability: AvailabilityBlockData[] = seedAvailability();
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

export function updateProfile(request: DoctorProfileUpdateRequest): DoctorProfile {
  profile = { ...profile, ...request };
  return profile;
}

export function getWeeklyAvailability(): AvailabilityBlockData[] {
  return availability;
}

export function getQueue(): QueueEntry[] {
  return queue;
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetDoctorStore(): void {
  summary = seedSummary();
  upcomingWork = seedUpcomingWork();
  profile = seedProfile();
  availability = seedAvailability();
  queue = seedQueue();
}
