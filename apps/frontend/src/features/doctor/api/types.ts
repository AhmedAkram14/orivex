export type { VerificationCase, VerificationCaseStatus } from '@/shared/verification/types';

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
 * Doctor Profile Redesign (2026-08-02): matches DoctorModule's real
 * `WorkExperienceView` exactly -- a work-history timeline entry backing the
 * Doctor Profile page's "Experience" section. `endDate` undefined means an
 * ongoing position ("present"), never a placeholder date.
 */
export interface DoctorWorkExperience {
  id: string;
  organizationName: string;
  position: string;
  /** The doctor's rank/degree at that position (e.g. "consultant") -- independent of the profile's current `professionalRank` below, since a past rank often differs from today's. */
  professionalRank?: ProfessionalRank;
  /** ISO date. */
  startDate: string;
  /** ISO date. Undefined means this is the doctor's current position. */
  endDate?: string;
  description?: string;
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
  /** Onboarding Redesign (2026-07-21 proposal, Stage O.9): the sole source of a doctor's specialty -- the transitional free-text `specialty` field is gone; resolve a display name via `@/features/reference`'s specialties list. */
  specialtyId: string;
  biography?: string;
  yearsOfExperience?: number;
  languages: string[];
  /** Doctor Profile Redesign (2026-08-02): plain string list, same shape/validation as `languages`. */
  insuranceProviders: string[];
  consultationFeeAmount?: number;
  /** Doctor Onboarding (Phase 4 continuation) -- optional hospital affiliation. */
  hospitalId?: string;
  /** Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.6). */
  professionalRank?: ProfessionalRank;
  /** ISO date. Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.6). */
  licenseExpiryDate?: string;
  /** Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.6) -- requires `hospitalId` to be set. */
  departmentId?: string;
  publications: DoctorPublication[];
  awards: DoctorAward[];
  /** Doctor Profile Redesign (2026-08-02): real work-history timeline. */
  workExperience: DoctorWorkExperience[];
  createdAt: string;
  updatedAt: string;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.6): matches DoctorModule's real ProfessionalRank enum exactly -- a plain enum, not reference data. */
export type ProfessionalRank = 'resident' | 'registrar' | 'specialist' | 'consultant' | 'professor';

/**
 * Doctor Onboarding (Phase 4 continuation): matches DoctorProfileController's
 * real `POST /doctors` request body exactly (`RegisterDoctorProfileRequestDto`).
 * Unlike the update request, licenseNumber is required and set exactly once.
 */
export interface RegisterDoctorProfileRequest {
  licenseNumber: string;
  specialtyId: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  /** Doctor Profile Redesign (2026-08-02): same shape/validation as `languages`. */
  insuranceProviders?: string[];
  consultationFeeAmount?: number;
  hospitalId?: string;
  professionalRank?: ProfessionalRank;
  licenseExpiryDate?: string;
  departmentId?: string;
  /** No `id` -- the backend's register DTO only accepts these fields per entry (`PortfolioWorkExperienceDto`). */
  workExperience?: {
    organizationName: string;
    position: string;
    professionalRank?: ProfessionalRank;
    startDate: string;
    endDate?: string;
    description?: string;
  }[];
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
  specialtyId?: string;
  biography?: string;
  yearsOfExperience?: number;
  languages?: string[];
  /** Doctor Profile Redesign (2026-08-02): same shape/validation as `languages`. */
  insuranceProviders?: string[];
  consultationFeeAmount?: number;
  /** Doctor Onboarding (Phase 4 continuation) -- optional hospital affiliation. */
  hospitalId?: string;
  professionalRank?: ProfessionalRank;
  licenseExpiryDate?: string;
  departmentId?: string;
  /** No `id`/`publishedAt` — the backend's update DTO only accepts `title`/`reference` per entry. */
  publications?: { title: string; reference?: string }[];
  /** No `id`/`awardedAt` — the backend's update DTO only accepts `title`/`issuingBody` per entry. */
  awards?: { title: string; issuingBody?: string }[];
  /** No `id` -- the backend's update DTO only accepts these fields per entry (`PortfolioWorkExperienceDto`). */
  workExperience?: {
    organizationName: string;
    position: string;
    professionalRank?: ProfessionalRank;
    startDate: string;
    endDate?: string;
    description?: string;
  }[];
}

/** Doctor Onboarding (Phase 4 continuation): matches AdministrationModule's real HospitalResponseDto exactly (as returned by the public /hospitals directory). */
export interface HospitalOption {
  id: string;
  name: string;
  address?: string;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.6): matches AdministrationModule's real DepartmentResponseDto exactly (as returned by the public /hospitals/:id/departments directory). */
export interface DepartmentOption {
  id: string;
  hospitalId: string;
  name: string;
  createdAt: string;
}

/** Matches DoctorVerificationController's real SubmitDoctorVerificationRequestDto exactly. */
export interface SubmitVerificationRequest {
  licenseNumber: string;
  specialtyCode: string;
  documentAssetIds: string[];
}

// `AvailabilityBlockData`/`WeeklyAvailabilityResponse` (Phase 7's
// deliberately simple, hour-granularity Schedule Foundation shape) are
// retired here — Phase 9's `RecurringWeeklySchedule`/`WorkingHoursDay`
// (`features/scheduling/types.ts`) is exactly the replacement their own
// doc comment anticipated: minute-granularity, real breaks, real
// exceptions. The Doctor Availability page (`doctor/schedule/page.tsx`)
// now consumes that type directly instead of a doctor-owned shape.

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): matches
 * DoctorProfileController's real GET /doctors (list) response exactly --
 * `DoctorDirectoryEntryResponseDto`. Deliberately its own, smaller shape
 * (not the full `DoctorProfile`): a directory listing surfaces only what a
 * prospective patient needs to browse/filter, not biography/publications/
 * awards/contact info (those are the single-profile view's concern, see
 * `DoctorProfile` above / `getById`).
 */
export interface DoctorDirectoryEntry {
  doctorProfileId: string;
  accountId: string;
  displayName: string;
  specialtyId: string;
  yearsOfExperience?: number;
  consultationFeeAmount?: number;
  hospitalId?: string;
}

/** Matches DoctorProfileController's real `ListDoctorDirectoryQueryDto` exactly -- all optional, `specialty` is a free-text contains-match (now matched via a MedicalSpecialty.name join server-side, Stage O.9), `specialtyId`/`hospitalId` are exact-match UUID filters. */
export interface ListDoctorDirectoryParams {
  page?: number;
  limit?: number;
  specialty?: string;
  specialtyId?: string;
  hospitalId?: string;
}

/** Matches DoctorProfileController's real `DoctorDirectoryResponseDto` exactly. */
export interface DoctorDirectoryResult {
  doctors: DoctorDirectoryEntry[];
  total: number;
  page: number;
  limit: number;
}

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

/** Doctor-approval-workflow fix: matches PendingApprovalAppointmentResponseDto exactly. */
export interface PendingApprovalAppointment {
  id: string;
  patientName: string;
  scheduledAt: string;
  reasonForVisit?: string;
  consultationType: 'free' | 'paid';
}

/** The real AppointmentResponseDto's shape, narrowed to what the approve action's caller needs. */
export interface ApprovedAppointment {
  id: string;
  status: string;
}

/** Matches DoctorAppointmentsController's real DoctorPatientListItemResponseDto exactly -- one row per distinct patient the doctor has ever had a real appointment with. No "last diagnosis" field: that lives in ClinicalModule, which the backend endpoint can't reach without a circular module dependency (see the DTO's own comment). */
export interface DoctorPatientListItem {
  patientProfileId: string;
  patientName: string;
  email: string;
  phoneNumber?: string;
  /** ISO date string. */
  dateOfBirth?: string;
  gender?: string;
  visitCount: number;
  /** ISO timestamp of the most recent visit. */
  lastVisitAt: string;
  lastVisitStatus: AppointmentStatus;
  /** ISO timestamp of the soonest still-upcoming appointment, if any. */
  nextAppointmentAt?: string;
  /** Real -- reuses ClinicalModule's own FollowUpRecommendation, only meaningful when there's no nextAppointmentAt yet. */
  hasFollowUpRecommendation: boolean;
}

export type AppointmentStatus = 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed';

/** Matches DoctorAppointmentsController's real DoctorReportsSummaryResponseDto exactly -- real appointment-status counts + the doctor's own real rating aggregate. No day-over-day/trend field: there's no historical snapshot to diff against. */
export interface DoctorReportsSummary {
  totalAppointments: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  averageRating: number | null;
  reviewCount: number;
}
