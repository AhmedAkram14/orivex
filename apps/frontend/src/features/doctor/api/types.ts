export interface DoctorDashboardSummary {
  consultationsToday: number;
  patientsInQueue: number;
  completedToday: number;
}

export type UpcomingWorkStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';

export interface UpcomingWorkItem {
  id: string;
  /** ISO timestamp — components format it for display, this type never carries pre-formatted text. */
  scheduledAt: string;
  title: string;
  description?: string;
  status: UpcomingWorkStatus;
}

export type UpcomingWorkResponse = UpcomingWorkItem[];

export interface DoctorQualification {
  id: string;
  /** e.g. "MD, Cairo University" — a single free-text credential line, not a structured degree/institution split (that's `TrustModule`'s verification-document scope, Phase 7's own remaining work). */
  title: string;
  year?: number;
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DoctorAvailabilitySummary {
  /** Days with at least one availability block — a summary for the profile page, not the detailed block/slot data `SchedulingModule`'s `AvailabilityWindow` will eventually back (Phase 7's Schedule Foundation milestone). */
  daysAvailable: WeekDay[];
  /** Pre-formatted, localized hours text (e.g. "9:00 AM – 5:00 PM") — this type never carries raw times to format. */
  hoursLabel: string;
}

export interface DoctorProfile {
  id: string;
  fullName: string;
  specialization: string;
  bio: string;
  qualifications: DoctorQualification[];
  yearsOfExperience: number;
  languages: string[];
  email: string;
  phone: string;
  availability: DoctorAvailabilitySummary;
}

/** Only the fields a doctor can actually edit about their own profile — identity fields (`fullName`, `email`) and verification-backed fields (`qualifications`, via `TrustModule`) are deliberately excluded from this phase's edit architecture. */
export interface DoctorProfileUpdateRequest {
  specialization: string;
  bio: string;
  yearsOfExperience: number;
  languages: string[];
  phone: string;
}

/**
 * A recurring weekly availability window — the Schedule Foundation's data
 * shape, distinct from `DoctorAvailabilitySummary` (the profile page's
 * plain-text summary of the same underlying reality). This is what
 * `SchedulingModule`'s real `AvailabilityWindow` will eventually replace;
 * the shape here is deliberately simple (one day, one start/end hour) so
 * that replacement is a data-source change, not a UI rewrite.
 */
export interface AvailabilityBlockData {
  id: string;
  dayOfWeek: WeekDay;
  /** 24-hour clock, e.g. 9 for 9:00 AM. */
  startHour: number;
  /** 24-hour clock, e.g. 17 for 5:00 PM. */
  endHour: number;
}

export type WeeklyAvailabilityResponse = AvailabilityBlockData[];
