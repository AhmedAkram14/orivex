import { apiFetch } from '@/shared/lib/api/client';
import { CONSULTATION_PATHS } from '@/features/consultation/api/paths';
import type {
  ClinicalNote,
  ConsultationCompletionReason,
  ConsultationFeedback,
  ConsultationSession,
  ConsultationSummary,
  DiagnosisNode,
  DoctorReviewsResult,
  FollowUpRecommendation,
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
  ) =>
    apiFetch<{ node: DiagnosisNode }>({
      method: 'POST',
      path: CONSULTATION_PATHS.diagnosis(consultationSessionId),
      body: { freeTextDescription, certaintyLevel },
    }),

  recordNote: (consultationSessionId: string, content: string) =>
    apiFetch<ClinicalNote>({ method: 'POST', path: CONSULTATION_PATHS.notes(consultationSessionId), body: { content } }),

  getDoctorReviews: (doctorProfileId: string, page = 1, limit = 20) =>
    apiFetch<DoctorReviewsResult>({
      path: `${CONSULTATION_PATHS.doctorReviews(doctorProfileId)}?page=${page}&limit=${limit}`,
    }),
};
