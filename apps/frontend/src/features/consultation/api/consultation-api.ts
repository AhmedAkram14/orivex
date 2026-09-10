import { apiFetch } from '@/shared/lib/api/client';
import { CONSULTATION_PATHS } from '@/features/consultation/api/paths';
import type {
  AISuggestion,
  AISuggestionDecision,
  AISuggestionType,
  AISuggestionUnavailable,
  ClinicalNote,
  ConsultationCompletionReason,
  ConsultationFeedback,
  ConsultationPrescription,
  ConsultationSession,
  ConsultationSummary,
  ConsultationVitalReading,
  DiagnosisNode,
  Dispute,
  DoctorReviewsResult,
  FollowUpRecommendation,
  HealthJourney,
  JourneyStage,
  LabRequestRecord,
  RecordLabRequestInput,
  SignPrescriptionLineItemInput,
  VerifyPrescriptionResult,
  VitalReadingType,
} from '@/features/consultation/api/types';

export interface SubmitFeedbackInput {
  rating: number;
  comment?: string;
  communicationRating?: number;
  punctualityRating?: number;
  thoroughnessRating?: number;
}

/**
 * The only module that talks to `/consultations/:id/*` lifecycle routes
 * (plus the doctor-reviews read, which lives on the same backend module --
 * see ConsultationSummaryController/DoctorReviewsController's own comments
 * for why) — mirrors `telemedicineApi`'s shape: a thin typed wrapper over
 * `apiFetch`.
 */
export const consultationApi = {
  start: (consultationSessionId: string) =>
    apiFetch<ConsultationSession>({ method: 'POST', path: CONSULTATION_PATHS.start(consultationSessionId) }),

  /**
   * The doctor's explicit clinical-completion action -- distinct from
   * "Leave call" (which only tears down the video connection). Defaults to
   * `completionReason: 'completed'`; a doctor closing early due to a
   * technical problem can pass `'interrupted_technical'` instead, which
   * leaves the Appointment Confirmed (not Completed) so it can be resumed.
   */
  close: (consultationSessionId: string, completionReason: ConsultationCompletionReason = 'completed') =>
    apiFetch<ConsultationSession>({
      method: 'POST',
      path: CONSULTATION_PATHS.close(consultationSessionId),
      body: { completionReason },
    }),

  getSummary: (consultationSessionId: string) =>
    apiFetch<ConsultationSummary>({ path: CONSULTATION_PATHS.summary(consultationSessionId) }),

  submitFeedback: (consultationSessionId: string, input: SubmitFeedbackInput) =>
    apiFetch<ConsultationFeedback>({
      method: 'POST',
      path: CONSULTATION_PATHS.feedback(consultationSessionId),
      body: input,
    }),

  updateFeedback: (consultationSessionId: string, input: SubmitFeedbackInput) =>
    apiFetch<ConsultationFeedback>({
      method: 'PATCH',
      path: CONSULTATION_PATHS.feedback(consultationSessionId),
      body: input,
    }),

  deleteFeedback: (consultationSessionId: string) =>
    apiFetch<void>({ method: 'DELETE', path: CONSULTATION_PATHS.feedback(consultationSessionId) }),

  recommendFollowUp: (consultationSessionId: string, reason: string, recommendedDate?: string) =>
    apiFetch<FollowUpRecommendation>({
      method: 'POST',
      path: CONSULTATION_PATHS.followUp(consultationSessionId),
      body: { reason, recommendedDate },
    }),

  recordDiagnosis: (
    consultationSessionId: string,
    freeTextDescription: string,
    certaintyLevel?: 'suspected' | 'confirmed' | 'ruled_out',
    startJourney?: boolean,
  ) =>
    apiFetch<{ node: DiagnosisNode; journey?: HealthJourney }>({
      method: 'POST',
      path: CONSULTATION_PATHS.diagnosis(consultationSessionId),
      body: { freeTextDescription, certaintyLevel, startJourney },
    }),

  // I5 -- SOAP-structured clinical notes. Matches RecordClinicalNoteRequestDto exactly.
  recordNote: (
    consultationSessionId: string,
    soap: { subjective: string; objective: string; assessment: string; plan: string },
  ) =>
    apiFetch<ClinicalNote>({ method: 'POST', path: CONSULTATION_PATHS.notes(consultationSessionId), body: soap }),

  /** One reading per call, matching the real backend contract (POST /consultations/:id/vitals accepts exactly one type per request) -- a partial submit (e.g. weight only) calls this once, a full submit calls it up to three times. */
  recordVital: (consultationSessionId: string, type: VitalReadingType, value: number, diastolicValue?: number) =>
    apiFetch<ConsultationVitalReading>({
      method: 'POST',
      path: CONSULTATION_PATHS.vitals(consultationSessionId),
      body: { type, value, diastolicValue },
    }),

  getDoctorReviews: (doctorProfileId: string, page = 1, limit = 20) =>
    apiFetch<DoctorReviewsResult>({
      path: `${CONSULTATION_PATHS.doctorReviews(doctorProfileId)}?page=${page}&limit=${limit}`,
    }),

  /**
   * One prescription per call, matching the real backend contract exactly
   * (`POST /prescriptions` signs one prescription, whose lineItems[] is a
   * single doctor-supplied medication here) -- a doctor prescribing more
   * than one medication in a visit calls this once per medication, never a
   * fabricated bulk endpoint.
   */
  signPrescription: (consultationSessionId: string, diagnosisNodeId: string, lineItem: SignPrescriptionLineItemInput) =>
    apiFetch<ConsultationPrescription>({
      method: 'POST',
      path: CONSULTATION_PATHS.prescriptions(),
      body: { consultationSessionId, diagnosisNodeId, lineItems: [lineItem] },
    }),

  /**
   * I1 -- Lab Requests (docs/01-prd.md §2.9 "Lightweight in V1"): a
   * structured advisory test-request document, matching the real backend
   * contract exactly (`POST /lab-requests`, consultationSessionId carried in
   * the body). Never a real lab-system order -- no result ever flows back.
   */
  recordLabRequest: (consultationSessionId: string, input: RecordLabRequestInput) =>
    apiFetch<LabRequestRecord>({
      method: 'POST',
      path: CONSULTATION_PATHS.labRequests(),
      body: { consultationSessionId, ...input },
    }),

  /**
   * Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
   * only the treating doctor may call this (enforced server-side by the
   * real doctor-relationship + consent check JourneyController runs).
   */
  updateJourneyStage: (journeyId: string, stage: JourneyStage) =>
    apiFetch<HealthJourney>({ method: 'PATCH', path: CONSULTATION_PATHS.journeyStage(journeyId), body: { stage } }),

  /**
   * AI Copilot (docs/01.1-prd-update.md §4). Sends only what the real
   * backend contract requires -- consultationSessionId + suggestionType.
   * The real clinical context is built server-side from
   * GetHealthGraphSubgraphUseCase; this client never sends patient history,
   * diagnoses, or medication lists itself, even though the endpoint could
   * technically accept an arbitrary body. A 202 "unavailable" response
   * (no AI provider configured, or the real provider call failed) is a
   * normal, non-error outcome -- not thrown as an ApiError.
   */
  requestAISuggestion: (consultationSessionId: string, suggestionType: AISuggestionType) =>
    apiFetch<AISuggestion | AISuggestionUnavailable>({
      method: 'POST',
      path: CONSULTATION_PATHS.aiSuggestions(),
      body: { consultationSessionId, suggestionType },
    }),

  /** The doctor's explicit review decision on one AI suggestion -- never inferred client-side. */
  recordAIDecision: (suggestionId: string, decision: AISuggestionDecision, justification?: string) =>
    apiFetch<AISuggestion>({
      method: 'PATCH',
      path: CONSULTATION_PATHS.aiSuggestionDecision(suggestionId),
      body: { decision, justification },
    }),

  /**
   * I11 -- Admin content moderation: the reviewed doctor's own precautionary
   * flag on a review about them -- matches DoctorReviewFlagController's real
   * contract exactly (`PATCH /reviews/:id/flag`).
   */
  flagReview: (feedbackId: string, reason: string) =>
    apiFetch<ConsultationFeedback>({ method: 'PATCH', path: CONSULTATION_PATHS.flagReview(feedbackId), body: { reason } }),

  // I11 -- Admin dispute resolution: raised by either genuine party on a real appointment.
  raiseDispute: (appointmentId: string, reason: string) =>
    apiFetch<Dispute>({ method: 'POST', path: CONSULTATION_PATHS.disputes(), body: { appointmentId, reason } }),

  listMyDisputes: () => apiFetch<Dispute[]>({ path: CONSULTATION_PATHS.disputes() }),

  /** I12 -- Prescription digital signature and verification marker: public, no auth required. */
  verifyPrescription: (code: string) =>
    apiFetch<VerifyPrescriptionResult>({ path: CONSULTATION_PATHS.verifyPrescription(code) }),
};
