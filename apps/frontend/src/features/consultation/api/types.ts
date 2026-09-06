/** Matches ConsultationController's real ConsultationSessionResponseDto exactly. */
export interface ConsultationSession {
  id: string;
  appointmentId: string;
  state: 'waiting_room' | 'in_progress' | 'completed' | 'interrupted' | 'closed' | 'emergency_escalation';
  completionReason: 'completed' | 'interrupted_technical' | 'interrupted_other' | null;
  startedAt: string | null;
  closedAt: string | null;
}

/** Matches ConsultationController's real CloseConsultationRequestDto. */
export type ConsultationCompletionReason = 'completed' | 'interrupted_technical' | 'interrupted_other';

/** Matches AppointmentResponseDto exactly. */
export interface ConsultationAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  consultationType: 'free' | 'paid';
  status: 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'no_show' | 'completed';
  scheduledAt: string;
  reasonForVisit: string | null;
  rescheduledFromId: string | null;
}

/** Matches ClinicalNoteResponseDto exactly. */
export interface ClinicalNote {
  id: string;
  consultationSessionId: string;
  content: string;
  addendumOfNoteId: string | null;
  createdAt: string;
}

/** Matches PrescriptionLineItemDto exactly. */
export interface PrescriptionLineItem {
  drugCatalogId: string | null;
  drugName: string | null;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
}

/** Matches PrescriptionResponseDto exactly. */
export interface ConsultationPrescription {
  id: string;
  consultationSessionId: string;
  diagnosisNodeId: string;
  status: 'draft' | 'signed' | 'active' | 'expired' | 'superseded';
  lineItems: PrescriptionLineItem[];
  signedAt: string | null;
}

/**
 * Matches SignPrescriptionRequestDto's own lineItems[] shape exactly.
 * drugCatalogId is required by the real backend contract (no ReferenceDataModule
 * drug catalog exists yet -- PrescriptionLineItem's own domain comment: "stored
 * as real, required, doctor-supplied data with no FK"), so the caller mints a
 * real client-side id (crypto.randomUUID()) rather than referencing a
 * fabricated catalog entry; drugName carries the doctor's actual free-text
 * medication name and is what every consumer (patient portal, doctor chart)
 * displays.
 */
export interface SignPrescriptionLineItemInput {
  drugCatalogId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

/** Matches HealthGraphNodeResponseDto exactly. */
export interface DiagnosisNode {
  id: string;
  nodeType: string;
  description: string | null;
  certaintyLevel: 'suspected' | 'confirmed' | 'ruled_out';
  createdAt: string;
}

/** Matches FollowUpRecommendationResponseDto exactly. */
export interface FollowUpRecommendation {
  id: string;
  consultationSessionId: string;
  reason: string;
  recommendedDate: string | null;
  createdAt: string;
}

/** Matches ConsultationFeedbackResponseDto exactly. */
export interface ConsultationFeedback {
  id: string;
  consultationSessionId: string;
  doctorId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** Empty/absent for a patient viewing their own submitted feedback (nothing to resolve) -- populated only on the public reviews list. */
  patientProfileId: string;
  patientName: string;
  patientAvatarUrl?: string;
}

/** Same VitalType/valueLabel shape as the patient portal's own VitalReading (apps/frontend/src/features/patient/api/types.ts) -- one real source of truth, this is just the subset recorded during THIS specific consultation session. */
export type VitalReadingType = 'weight' | 'blood-pressure' | 'blood-sugar';

/** Matches VitalReadingResponseDto exactly. */
export interface ConsultationVitalReading {
  id: string;
  type: VitalReadingType;
  recordedAt: string;
  valueLabel: string;
  value: number;
  diastolicValue?: number;
}

/**
 * Matches docs/12-openapi.md's HealthJourney schema, and JourneyStage's own
 * forward-only state model exactly (Health Journey stage-advance fix,
 * ORIVEX Remaining Work Audit P0 C5): Diagnosis -> FollowUp -> Monitoring ->
 * (Resolved | OngoingChronic), with ReferredOut reachable as an exceptional
 * branch from any non-terminal stage. Terminal stages never advance
 * further.
 */
export type JourneyStage = 'diagnosis' | 'follow_up' | 'monitoring' | 'resolved' | 'ongoing_chronic' | 'referred_out';

/** Matches HealthJourneyResponseDto exactly. */
export interface HealthJourney {
  id: string;
  rootNode: DiagnosisNode;
  stage: JourneyStage;
  linkedNodeIds: string[];
  lastUpdatedAt: string;
}

/** Matches ConsultationSummaryResponseDto exactly -- backs both the doctor wrap-up view and the patient post-consultation summary. */
export interface ConsultationSummary {
  session: ConsultationSession;
  appointment: ConsultationAppointment;
  clinicalNotes: ClinicalNote[];
  prescriptions: ConsultationPrescription[];
  diagnoses: DiagnosisNode[];
  vitalReadings: ConsultationVitalReading[];
  followUpRecommendation: FollowUpRecommendation | null;
  feedback: ConsultationFeedback | null;
  journeys: HealthJourney[];
}

/** Matches DoctorReviewsResponseDto exactly. */
export interface DoctorReviewsResult {
  reviews: ConsultationFeedback[];
  total: number;
  page: number;
  limit: number;
  averageRating: number | null;
  reviewCount: number;
  writtenReviewCount: number;
}
