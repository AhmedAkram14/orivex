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

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
}

/**
 * Clinical facts about the patient — deliberately read-only from the
 * frontend's perspective (CLAUDE.md: "AI never writes directly to clinical
 * records," extended here to "a patient never self-edits their own clinical
 * record" either; these fields are clinician-entered via `ClinicalModule`,
 * not yet wired into this frontend). Always honestly empty today: the real
 * backend (PatientModule's PatientProfileController) doesn't return this at
 * all yet — no ClinicalModule exists — so this object is a client-side
 * constant, not something the API response carries. `allergies`/
 * `chronicConditions` are honest empty arrays, never fabricated.
 */
export interface PatientMedicalInfo {
  /** e.g. "O+" — undefined means not yet on record, never a guessed default. */
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
}

/**
 * Matches PatientModule's real `PatientProfileResponseDto` exactly.
 * `phoneNumber` is composed from the owning Account's own profile (Identity
 * has no update-profile endpoint yet, so it's read-only here). `gender` and
 * `address` have no backend field anywhere — deliberately absent, not
 * fabricated. `dateOfBirth` is undefined until the patient sets one.
 */
export interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  /** ISO date. Undefined when not yet on record. */
  dateOfBirth?: string;
  emergencyContacts: EmergencyContact[];
}

/**
 * Only the fields PatientProfileController's real PATCH endpoint accepts.
 * `emergencyContacts` omits `id` per entry for new contacts (the backend
 * assigns it); existing contacts keep theirs so updates target the right
 * row.
 */
export interface PatientProfileUpdateRequest {
  /** ISO date. */
  dateOfBirth?: string;
  emergencyContacts: (Omit<EmergencyContact, 'id'> & { id?: string })[];
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
  status: AppointmentStatus;
  consultationType: ConsultationType;
  reasonForVisit?: string;
}

export type AppointmentsResponse = Appointment[];

export type MedicalRecordEntryType = 'visit' | 'diagnosis' | 'allergy' | 'condition';

/**
 * A single chronological medical-record entry — the Timeline architecture's
 * data shape (milestone 4). Pulled forward from Phase 10's Health Graph/
 * Journey Timeline scope onto this simpler, self-contained shape for now;
 * a real `ClinicalModule` integration later is a data-source swap, not a
 * UI rewrite, per this codebase's established pattern for every other
 * not-yet-backed feature.
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
