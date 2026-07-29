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
import { getAppointments } from '@/mocks/patient-store';
import { getDoctorById } from '@/mocks/doctor-store';

/**
 * In-memory mock "backend" state for `POST /consultations/:id/close` and
 * everything downstream of it (summary/feedback/follow-up/reviews) --
 * mirrors `patient-store.ts`/`doctor-store.ts`'s pattern. Keyed by
 * `consultationSessionId` (the same `session-${appointmentId}` id
 * `patient-store.ts`'s `bookAppointment()` already mints for paid
 * bookings), since that's the only session id this mock system has ever
 * produced. An honest empty reality: nothing is Completed until a test (or
 * a manual QA click-through) actually closes it.
 */
const sessions = new Map<string, ConsultationSession>();
const feedbackBySessionId = new Map<string, ConsultationFeedback>();
const followUpBySessionId = new Map<string, FollowUpRecommendation>();
const notesBySessionId = new Map<string, ClinicalNote[]>();
const diagnosesBySessionId = new Map<string, DiagnosisNode[]>();

const DOCTOR_ID = 'doctor-profile-1';

function findAppointmentBySessionId(consultationSessionId: string) {
  return getAppointments().find((appointment) => appointment.consultationSessionId === consultationSessionId);
}

function getOrCreateSession(consultationSessionId: string): ConsultationSession {
  const existing = sessions.get(consultationSessionId);
  if (existing) return existing;
  const created: ConsultationSession = {
    id: consultationSessionId,
    appointmentId: findAppointmentBySessionId(consultationSessionId)?.id ?? consultationSessionId,
    state: 'waiting_room',
    completionReason: null,
    startedAt: null,
    closedAt: null,
  };
  sessions.set(consultationSessionId, created);
  return created;
}

export function getConsultationSession(consultationSessionId: string): ConsultationSession {
  return getOrCreateSession(consultationSessionId);
}

export function startConsultation(consultationSessionId: string): ConsultationSession {
  const session = getOrCreateSession(consultationSessionId);
  const started: ConsultationSession = {
    ...session,
    state: 'in_progress',
    startedAt: session.startedAt ?? new Date().toISOString(),
  };
  sessions.set(consultationSessionId, started);
  return started;
}

export function recordConsultationNote(consultationSessionId: string, content: string): ClinicalNote {
  const note: ClinicalNote = {
    id: `note-${Date.now()}`,
    consultationSessionId,
    content,
    addendumOfNoteId: null,
    createdAt: new Date().toISOString(),
  };
  notesBySessionId.set(consultationSessionId, [...(notesBySessionId.get(consultationSessionId) ?? []), note]);
  return note;
}

export function recordConsultationDiagnosis(
  consultationSessionId: string,
  freeTextDescription: string,
  certaintyLevel: 'suspected' | 'confirmed' | 'ruled_out' = 'suspected',
): DiagnosisNode {
  const node: DiagnosisNode = {
    id: `diagnosis-${Date.now()}`,
    nodeType: 'condition',
    description: freeTextDescription,
    certaintyLevel,
    createdAt: new Date().toISOString(),
  };
  diagnosesBySessionId.set(consultationSessionId, [
    ...(diagnosesBySessionId.get(consultationSessionId) ?? []),
    node,
  ]);
  return node;
}

export function closeConsultation(
  consultationSessionId: string,
  completionReason: ConsultationCompletionReason,
): ConsultationSession {
  const session = getOrCreateSession(consultationSessionId);
  const closed: ConsultationSession = {
    ...session,
    state: completionReason === 'completed' ? 'completed' : 'interrupted',
    completionReason,
    startedAt: session.startedAt ?? new Date().toISOString(),
    closedAt: new Date().toISOString(),
  };
  sessions.set(consultationSessionId, closed);
  return closed;
}

export function getConsultationSummary(consultationSessionId: string): ConsultationSummary {
  const session = getOrCreateSession(consultationSessionId);
  const appointment = findAppointmentBySessionId(consultationSessionId);

  return {
    session,
    appointment: {
      id: appointment?.id ?? consultationSessionId,
      patientId: 'patient-profile-1',
      doctorId: DOCTOR_ID,
      availabilityWindowId: '',
      consultationType: appointment?.consultationType ?? 'paid',
      status: appointment?.status ?? 'confirmed',
      scheduledAt: appointment?.scheduledAt ?? new Date().toISOString(),
      reasonForVisit: appointment?.reasonForVisit ?? null,
      rescheduledFromId: null,
    },
    clinicalNotes: notesBySessionId.get(consultationSessionId) ?? [],
    prescriptions: [],
    diagnoses: diagnosesBySessionId.get(consultationSessionId) ?? [],
    followUpRecommendation: followUpBySessionId.get(consultationSessionId) ?? null,
    feedback: feedbackBySessionId.get(consultationSessionId) ?? null,
  };
}

export function submitConsultationFeedback(
  consultationSessionId: string,
  rating: number,
  comment: string | undefined,
): ConsultationFeedback {
  const feedback: ConsultationFeedback = {
    id: `feedback-${Date.now()}`,
    consultationSessionId,
    doctorId: DOCTOR_ID,
    rating,
    comment: comment ?? null,
    createdAt: new Date().toISOString(),
  };
  feedbackBySessionId.set(consultationSessionId, feedback);
  return feedback;
}

export function updateConsultationFeedback(
  consultationSessionId: string,
  rating: number,
  comment: string | undefined,
): ConsultationFeedback | null {
  const existing = feedbackBySessionId.get(consultationSessionId);
  if (!existing) return null;
  const updated: ConsultationFeedback = { ...existing, rating, comment: comment ?? null };
  feedbackBySessionId.set(consultationSessionId, updated);
  return updated;
}

export function deleteConsultationFeedback(consultationSessionId: string): boolean {
  return feedbackBySessionId.delete(consultationSessionId);
}

export function recommendFollowUp(
  consultationSessionId: string,
  reason: string,
  recommendedDate: string | undefined,
): FollowUpRecommendation {
  const followUp: FollowUpRecommendation = {
    id: `follow-up-${Date.now()}`,
    consultationSessionId,
    reason,
    recommendedDate: recommendedDate ?? null,
    createdAt: new Date().toISOString(),
  };
  followUpBySessionId.set(consultationSessionId, followUp);
  return followUp;
}

export function getDoctorReviews(doctorProfileId: string, page: number, limit: number): DoctorReviewsResult {
  if (getDoctorById(doctorProfileId) === null) {
    return { reviews: [], total: 0, page, limit, averageRating: null, reviewCount: 0 };
  }
  const reviews = Array.from(feedbackBySessionId.values()).filter((review) => review.doctorId === doctorProfileId);
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount === 0 ? null : reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
  const start = (page - 1) * limit;
  return { reviews: reviews.slice(start, start + limit), total: reviewCount, page, limit, averageRating, reviewCount };
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetConsultationStore(): void {
  sessions.clear();
  feedbackBySessionId.clear();
  followUpBySessionId.clear();
  notesBySessionId.clear();
  diagnosesBySessionId.clear();
}
