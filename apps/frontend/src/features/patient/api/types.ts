export interface PatientDashboardSummary {
  upcomingAppointmentsCount: number;
  activePrescriptionsCount: number;
  /** ISO date of the most recent completed visit — undefined means no visit on record yet, never a fabricated date. */
  lastVisitAt?: string;
}

export type UpcomingAppointmentPreviewStatus = 'upcoming' | 'in-progress';

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

export type ActivePrescriptionPreviewStatus = 'active' | 'refill-due';

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

export type PatientGender = 'female' | 'male' | 'other' | 'unspecified';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

/**
 * Clinical facts about the patient — deliberately read-only from the
 * frontend's perspective (CLAUDE.md: "AI never writes directly to clinical
 * records," extended here to "a patient never self-edits their own clinical
 * record" either; these fields are clinician-entered via `ClinicalModule`,
 * not yet wired into this frontend). `allergies`/`chronicConditions` are
 * honest empty arrays when nothing is on record, never fabricated.
 */
export interface PatientMedicalInfo {
  /** e.g. "O+" — undefined means not yet on record, never a guessed default. */
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
}

export interface PatientProfile {
  id: string;
  fullName: string;
  /** ISO date. */
  dateOfBirth: string;
  gender: PatientGender;
  email: string;
  phone: string;
  address: string;
  medicalInfo: PatientMedicalInfo;
  emergencyContacts: EmergencyContact[];
}

/**
 * Only the fields a patient can actually edit about their own profile —
 * identity fields (`fullName`, `dateOfBirth`, `gender`, `email`) and
 * clinical fields (`medicalInfo`) are deliberately excluded, mirroring
 * `DoctorProfileUpdateRequest`'s exclusion of identity/verification-backed
 * fields. `emergencyContacts` omits `id` per entry for new contacts (the
 * backend assigns it); existing contacts keep theirs so updates target the
 * right row.
 */
export interface PatientProfileUpdateRequest {
  phone: string;
  address: string;
  emergencyContacts: (Omit<EmergencyContact, 'id'> & { id?: string })[];
}

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled';
export type AppointmentType = 'in-person' | 'video';

/**
 * The full appointment record — milestone 3's own type, deliberately
 * distinct from `UpcomingAppointmentPreview` (the dashboard's lighter
 * preview shape): this one backs a paginated/filterable list, not a
 * short "next few" widget.
 */
export interface Appointment {
  id: string;
  /** ISO timestamp — components format it for display, this type never carries pre-formatted text. */
  scheduledAt: string;
  doctorName: string;
  specialization: string;
  status: AppointmentStatus;
  type: AppointmentType;
  /** Present only for `type: 'in-person'`. */
  location?: string;
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
