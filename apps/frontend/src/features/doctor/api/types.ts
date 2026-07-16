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

// `WeekDay` now lives in `features/scheduling/types.ts` (Phase 9) — the
// generic Scheduling & Appointment Infrastructure's own domain model.
// Re-exported here so this module's existing callers (`DoctorAvailabilitySummary`,
// `doctor/schedule/page.tsx`) don't need an import-path change, mirroring the
// `shared/lib/date/week.ts` extraction's own backward-compatible re-export pattern.
import type { WeekDay } from '@/features/scheduling/types';

export type { WeekDay };

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

// `AvailabilityBlockData`/`WeeklyAvailabilityResponse` (Phase 7's
// deliberately simple, hour-granularity Schedule Foundation shape) are
// retired here — Phase 9's `RecurringWeeklySchedule`/`WorkingHoursDay`
// (`features/scheduling/types.ts`) is exactly the replacement their own
// doc comment anticipated: minute-granularity, real breaks, real
// exceptions. The Doctor Availability page (`doctor/schedule/page.tsx`)
// now consumes that type directly instead of a doctor-owned shape.

export type QueueEntryStatus = 'waiting' | 'in-consultation' | 'completed';

export interface QueueEntry {
  id: string;
  /** A caller-facing label for the entry — anonymized (e.g. "Patient #3") until a real Patient module exists to identify entries by name; never a fabricated patient name. */
  label: string;
  status: QueueEntryStatus;
  position: number;
  /** Minutes, pre-computed server-side — this type never carries a raw timestamp for the UI to do wait-time math on. */
  estimatedWaitMinutes?: number;
}

export type QueueResponse = QueueEntry[];
