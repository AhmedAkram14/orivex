import type { VerificationCaseStatus } from '@/shared/verification/types';

export interface PatientDashboardSummary {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  /** ISO date of the most recent completed visit — undefined means no visit on record yet, never a fabricated date. */
  lastVisitAt?: string;
}

/**
 * A fixed literal, not the full backend `AppointmentStatus` enum -- this
 * preview only ever returns non-terminal appointments (requested/confirmed/
 * rescheduled), and there is no live "in-progress" detection wired for this
 * lightweight dashboard preview yet (that would require checking each
 * appointment's ConsultationSession state, out of scope here). Never
 * fabricate an `'in-progress'` value the backend can't actually compute.
 */
export type UpcomingAppointmentPreviewStatus = 'upcoming';

/**
 * The dashboard's "next few appointments" preview — deliberately lighter
 * than milestone 3's full `Appointment` type (no location/notes/history),
 * since the dashboard only ever renders a short upcoming list, never the
 * full paginated/filterable appointment history.
 */
export interface UpcomingAppointmentPreview {
  id: string;
  /** ISO timestamp — components format it for display, this type never carries pre-formatted text. */
  scheduledAt: string;
  doctorName: string;
  specialization: string;
  /** The Arabic specialty name -- null until an admin has translated it. */
  specializationAr: string | null;
  status: UpcomingAppointmentPreviewStatus;
}

export type UpcomingAppointmentsResponse = UpcomingAppointmentPreview[];

/**
 * A fixed literal, not the full backend `PrescriptionStatus` enum -- there
 * is no "refill" concept anywhere in the real Prescription domain (no
 * refill count, no pharmacy integration), so `'refill-due'` is never
 * fabricated here. This preview only ever returns prescriptions the backend
 * has already computed as currently active (signed and not yet past their
 * line items' duration).
 */
export type ActivePrescriptionPreviewStatus = 'active';

/**
 * The dashboard's "active medications" preview — lighter than milestone 5's
 * full `Prescription` type (no full dosage schedule/refill history).
 */
export interface ActivePrescriptionPreview {
  id: string;
  medicationName: string;
  /** Pre-formatted, localized dosage text (e.g. "500mg, twice daily") — this type never carries raw dosage numbers to format. */
  dosageLabel: string;
  prescribedBy: string;
  status: ActivePrescriptionPreviewStatus;
}

export type ActivePrescriptionsResponse = ActivePrescriptionPreview[];

/** Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.7): matches PatientModule's real EmergencyRelationship enum exactly -- a plain enum, not free text (the backend now validates it as such). */
export type EmergencyRelationship = 'parent' | 'spouse' | 'sibling' | 'child' | 'guardian' | 'other';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: EmergencyRelationship;
  phoneNumber: string;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.3/O.7): matches PatientModule's real BloodType enum exactly -- a plain enum, not reference data. */
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

/** Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.7): matches Identity's real Gender enum exactly. */
export type Gender = 'male' | 'female' | 'other';

/**
 * Matches PatientModule's real `PatientProfileResponseDto` exactly.
 * `phoneNumber` is composed from the owning Account's own profile.
 * `gender`/`nationalityId`/`address`/`dateOfBirth` are also Account-owned
 * (the shared Personal Info step, §0a) -- edited via `PATCH /accounts/me`,
 * not this profile's own PATCH endpoint (see `PatientProfileUpdateRequest`).
 * `bloodType`/`allergies`/`chronicDiseases`/`insuranceProviderId` (Stage
 * O.3/O.7) are genuinely this profile's own medical-profile fields.
 */
export interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  /** ISO date. Undefined when not yet on record. */
  dateOfBirth?: string;
  gender?: Gender;
  nationalityId?: string;
  address?: string;
  bloodType?: BloodType;
  /** Plain free text (finalized product decision, §11 -- no ICD-11/SNOMED CT coding). */
  allergies?: string;
  /** Plain free text, same reasoning as `allergies`. */
  chronicDiseases?: string;
  insuranceProviderId?: string;
  emergencyContacts: EmergencyContact[];
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.5): matches PatientProfileController's real PatientProfileExistsResponseDto exactly. */
export interface PatientProfileExistsResponse {
  exists: boolean;
}

/**
 * Only the fields PatientProfileController's real PATCH endpoint accepts --
 * matches `UpdatePatientProfileRequestDto` exactly. `dateOfBirth`/`gender`/
 * `nationalityId`/`address` are deliberately absent: they moved to the
 * shared `PATCH /accounts/me` (Identity-owned, §0a), never this endpoint.
 * `emergencyContacts` omits `id` per entry for new contacts (the backend
 * assigns it); existing contacts keep theirs so updates target the right
 * row.
 */
export interface PatientProfileUpdateRequest {
  emergencyContacts?: (Omit<EmergencyContact, 'id'> & { id?: string })[];
  bloodType?: BloodType;
  allergies?: string;
  chronicDiseases?: string;
  insuranceProviderId?: string;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): matches TrustModule's real IdentityVerificationStatusResponseDto exactly -- the UX-convenience check backing the four gated actions' pre-emptive "you'll need to verify" prompt. */
export interface IdentityVerificationStatus {
  status: VerificationCaseStatus | 'not_submitted';
  isVerified: boolean;
}

/** Onboarding Redesign (2026-07-21 proposal, Stage O.2/O.7): matches TrustModule's real SubmitPatientVerificationRequestDto exactly -- no license/specialty fields, unlike Doctor's. */
export interface SubmitPatientVerificationRequest {
  documentAssetIds: string[];
}

/** Matches ConsultationModule's real `AppointmentStatus` enum exactly. */
export type AppointmentStatus = 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed';

/** Matches ConsultationModule's real `ConsultationType` enum exactly — free vs. paid, not in-person vs. video. */
export type ConsultationType = 'free' | 'paid';

/**
 * The full appointment record — backed by the real `GET /appointments/me`
 * endpoint. Deliberately no `type`/`location` fields (in-person vs. video,
 * physical address) — no backend concept of either exists yet, only
 * `consultationType`.
 */
export interface Appointment {
  id: string;
  /** ISO timestamp — components format it for display, this type never carries pre-formatted text. */
  scheduledAt: string;
  doctorName: string;
  specialization: string;
  /** The Arabic specialty name -- null until an admin has translated it. */
  specializationAr: string | null;
  status: AppointmentStatus;
  consultationType: ConsultationType;
  reasonForVisit?: string;
  /**
   * Real once a Paid appointment is booked (opened at booking time, not
   * after payment — ORIVEX Roadmap 2.0 Stage 1) — the id PayNowForm charges
   * against. Null for Free appointments and for a Paid appointment that
   * hasn't been booked through the real flow.
   */
  consultationSessionId: string | null;
  /** True exactly when this appointment is Paid and still Requested (payment hasn't succeeded yet). */
  paymentRequired: boolean;
  /** The doctor's real consultation fee — null unless paymentRequired is true. */
  feeAmount: { amount: number; currency: string } | null;
}

export type AppointmentsResponse = Appointment[];

/**
 * Onboarding Redesign integration-gap closure (2026-07-25): the real
 * `POST /appointments` request shape (ConsultationModule's
 * `BookAppointmentRequestDto`) -- `availabilityWindowId` is the only slot
 * reference, never a raw start/end time.
 *
 * Consultation Pricing Redesign: no longer carries `consultationType` --
 * the backend dropped it from `BookAppointmentRequestDto` entirely (pricing
 * is inherent to the `AvailabilityWindow` being booked, never asserted by
 * the client, and the global `forbidNonWhitelisted` ValidationPipe now
 * rejects the field outright if sent).
 */
export interface BookAppointmentRequest {
  doctorId: string;
  availabilityWindowId: string;
  reasonForVisit?: string;
}

/**
 * The real `POST /appointments` response shape (ConsultationModule's
 * `AppointmentResponseDto`) -- deliberately leaner than `Appointment` above
 * (no `doctorName`/`specialization`, which that type composes from a joined
 * doctor lookup `GET /appointments/me` does server-side, not this create
 * response). `feeAmount`/`feeCurrency` are this appointment's own
 * snapshotted price (Consultation Pricing Redesign) -- flat fields, matching
 * `AppointmentResponseDto` exactly (distinct from `Appointment.feeAmount`
 * above, which composes them into a nested object for that list endpoint).
 */
export interface BookedAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  consultationType: ConsultationType;
  feeAmount: number | null;
  feeCurrency: string | null;
  status: AppointmentStatus;
  /** ISO timestamp. */
  scheduledAt: string;
  reasonForVisit: string | null;
  rescheduledFromId: string | null;
}

/**
 * Matches what `GET /patients/me/medical-records` (ClinicalModule's
 * PatientDashboardController) can actually compose: `'visit'` entries come
 * from a `ClinicalNote`, `'condition'` entries from a `HealthGraphNode`
 * whose `nodeType` is `condition`. The real domain's `HealthGraphNodeType`
 * has no separate "diagnosis" concept distinct from `condition`, and no
 * "allergy" concept anywhere — never fabricate a distinction the domain
 * doesn't make.
 */
export type MedicalRecordEntryType = 'visit' | 'condition';

/**
 * A single chronological medical-record entry — backed by the real
 * `GET /patients/me/medical-records` endpoint (ClinicalModule's
 * PatientDashboardController), composed from `ClinicalNote` and
 * `HealthGraphNode` entities.
 */
export interface MedicalRecordEntry {
  id: string;
  type: MedicalRecordEntryType;
  /** ISO date. */
  date: string;
  title: string;
  description?: string;
  doctorName?: string;
  /** A real, already-resolved download URL (e.g. an `AssetModule` presigned link) — undefined when no document exists for this entry, never fabricated. */
  downloadUrl?: string;
}

export type MedicalRecordsResponse = MedicalRecordEntry[];

/**
 * A fixed 2-value literal, not a 3rd `'completed'` state -- nothing in the
 * real Prescription domain ever marks a prescription "completed" as distinct
 * from naturally expiring (signedAt + max durationDays across line items
 * passing). There is also no "refill" concept anywhere in the real domain
 * (no refill count, no pharmacy integration) -- `RefillStatus` and
 * `refillStatus`/`refillsRemaining`/`dosesPerDay` (a raw doses-per-day count
 * `frequency` is unstructured free text, never a guessable number) are
 * deliberately absent from this type, never fabricated.
 */
export type PrescriptionStatus = 'active' | 'expired';

/**
 * The full prescription record — milestone 5's own type, deliberately
 * richer than `ActivePrescriptionPreview` (the dashboard's lighter
 * preview shape): this one backs the full Active/Previous medication list,
 * not a short "what's active right now" widget.
 */
export interface Prescription {
  id: string;
  medicationName: string;
  /** Pre-formatted, localized dosage amount text (e.g. "500mg") — this type never carries raw numbers to format. */
  dosageAmount: string;
  /** Pre-formatted, localized frequency text (e.g. "Twice daily"). */
  frequencyLabel: string;
  prescribedBy: string;
  /** ISO date. */
  prescribedAt: string;
  status: PrescriptionStatus;
  instructions?: string;
}

export type PrescriptionsResponse = Prescription[];

export type VitalType = 'weight' | 'blood-pressure' | 'blood-sugar';

/**
 * A single recorded vital-sign reading. `value` (and `diastolicValue` for
 * blood pressure) are raw numbers so `TrendChart` can plot them directly —
 * `valueLabel` is the separately pre-formatted, localized display text (e.g.
 * "72 kg", "120/80 mmHg", "95 mg/dL"), following this codebase's rule that
 * components never format raw data themselves.
 */
export interface VitalReading {
  id: string;
  type: VitalType;
  /** ISO timestamp. */
  recordedAt: string;
  valueLabel: string;
  value: number;
  /** Present only for `type: 'blood-pressure'` — `value` carries systolic, this carries diastolic. */
  diastolicValue?: number;
}

/**
 * One vital's full history — `readings` ordered oldest to newest (the shape
 * `TrendChart` expects), `latest` undefined when nothing has been recorded
 * yet (an honest empty state, never a fabricated reading).
 */
export interface HealthVitalSummary {
  type: VitalType;
  latest?: VitalReading;
  readings: VitalReading[];
}

export type HealthDashboardResponse = HealthVitalSummary[];
