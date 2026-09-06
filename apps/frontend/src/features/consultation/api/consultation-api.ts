import { apiFetch } from '@/shared/lib/api/client';
import { CONSULTATION_PATHS } from '@/features/consultation/api/paths';
import type {
  ClinicalNote,
  ConsultationCompletionReason,
  ConsultationFeedback,
  ConsultationPrescription,
  ConsultationSession,
  ConsultationSummary,
  ConsultationVitalReading,
  DiagnosisNode,
  DoctorReviewsResult,
  FollowUpRecommendation,
  HealthJourney,
  JourneyStage,
  SignPrescriptionLineItemInput,
  VitalReadingType,
} from '@/features/consultation/api/types';

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

  submitFeedback: (consultationSessionId: string, rating: number, comment?: string) =>
    apiFetch<ConsultationFeedback>({
      method: 'POST',
      path: CONSULTATION_PATHS.feedback(consultationSessionId),
      body: { rating, comment },
    }),

  updateFeedback: (consultationSessionId: string, rating: number, comment?: string) =>
    apiFetch<ConsultationFeedback>({
      method: 'PATCH',
      path: CONSULTATION_PATHS.feedback(consultationSessionId),
      body: { rating, comment },
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

  recordNote: (consultationSessionId: string, content: string) =>
    apiFetch<ClinicalNote>({ method: 'POST', path: CONSULTATION_PATHS.notes(consultationSessionId), body: { content } }),

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
   * Health Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5):
   * only the treating doctor may call this (enforced server-side by the
   * real doctor-relationship + consent check JourneyController runs).
   */
  updateJourneyStage: (journeyId: string, stage: JourneyStage) =>
    apiFetch<HealthJourney>({ method: 'PATCH', path: CONSULTATION_PATHS.journeyStage(journeyId), body: { stage } }),
};
