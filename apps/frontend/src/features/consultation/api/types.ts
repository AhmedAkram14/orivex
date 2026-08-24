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

/** Matches ConsultationSummaryResponseDto exactly -- backs both the doctor wrap-up view and the patient post-consultation summary. */
export interface ConsultationSummary {
  session: ConsultationSession;
  appointment: ConsultationAppointment;
  clinicalNotes: ClinicalNote[];
  prescriptions: ConsultationPrescription[];
  diagnoses: DiagnosisNode[];
  followUpRecommendation: FollowUpRecommendation | null;
  feedback: ConsultationFeedback | null;
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
