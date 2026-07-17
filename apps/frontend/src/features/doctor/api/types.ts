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

// `WeekDay` now lives in `features/scheduling/types.ts` (Phase 9) — the
// generic Scheduling & Appointment Infrastructure's own domain model.
// Re-exported here so this module's existing callers (`doctor/lib/week.ts`,
// `doctor/schedule/page.tsx`) don't need an import-path change, mirroring the
// `shared/lib/date/week.ts` extraction's own backward-compatible re-export pattern.
// Note: `DoctorAvailabilitySummary` (the profile-page availability block) was
// removed below — DoctorModule's real `AvailabilityWindow` is its own
// aggregate with its own future endpoint, not part of the profile response
// at all (docs/10-backend-architecture.md's DoctorModule entry), so it never
// belonged on this type.
import type { WeekDay } from '@/features/scheduling/types';

export type { WeekDay };

export interface DoctorPublication {
  id: string;
  title: string;
  reference?: string;
  /** ISO date. Undefined when not on record. */
  publishedAt?: string;
}

export interface DoctorAward {
  id: string;
  title: string;
  issuingBody?: string;
  /** ISO date. Undefined when not on record. */
  awardedAt?: string;
}

/**
 * Matches DoctorModule's real `DoctorProfileResponseDto` exactly.
 * `fullName`/`email`/`phoneNumber` are composed from the owning Account
 * (Identity has no update-profile endpoint yet, so they're read-only here,
 * same as `PatientProfile`'s own composed fields). `qualifications` and
 * `availability` — this type's old, fabricated fields — are deliberately
 * gone: the backend has no such concepts. `publications`/`awards` are real,
 * distinct concepts DoctorModule actually stores (`PortfolioPublication`/
 * `PortfolioAward`).
 */
export interface DoctorProfile {
  id: string;
  accountId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  licenseNumber: string;
  specialty: string;
  biography?: string;
  yearsOfExperience?: number;
  languages: string[];
  consultationFeeAmount?: number;
  publications: DoctorPublication[];
  awards: DoctorAward[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Only the fields DoctorProfileController's real `PATCH /doctors/me`
 * endpoint accepts — matches `UpdateDoctorProfileRequestDto` exactly, all
 * optional (a partial update). Identity fields (`fullName`, `email`,
 * `phoneNumber`) are Account-owned and excluded here, mirroring
 * `PatientProfileUpdateRequest`'s own identity-field exclusion.
 * `licenseNumber` is also excluded: the backend's update DTO never accepts
 * it (only `RegisterDoctorProfileUseCase` sets it, once, at registration).
 */
export interface DoctorProfileUpdateRequest {
  specialty?: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  consultationFeeAmount?: number;
  /** No `id`/`publishedAt` — the backend's update DTO only accepts `title`/`reference` per entry. */
  publications?: { title: string; reference?: string }[];
  /** No `id`/`awardedAt` — the backend's update DTO only accepts `title`/`issuingBody` per entry. */
  awards?: { title: string; issuingBody?: string }[];
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
  /** The real patient's display name — PatientModule is real now, so this is no longer the anonymized "Patient #3" placeholder; a doctor legitimately sees their own patients' names, same as `Appointment.doctorName`'s reverse case. */
  label: string;
  status: QueueEntryStatus;
  position: number;
  /** Minutes, pre-computed server-side — this type never carries a raw timestamp for the UI to do wait-time math on. */
  estimatedWaitMinutes?: number;
}

export type QueueResponse = QueueEntry[];
