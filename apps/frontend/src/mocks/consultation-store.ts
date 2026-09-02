import type {
  ClinicalNote,
  ConsultationCompletionReason,
  ConsultationFeedback,
  ConsultationSession,
  ConsultationSummary,
  ConsultationVitalReading,
  DiagnosisNode,
  DoctorReviewsResult,
  FollowUpRecommendation,
  VitalReadingType,
} from '@/features/consultation/api/types';
import { getAppointments, getProfile as getPatientProfile } from '@/mocks/patient-store';
import { getDoctorById, listAllDoctorProfiles } from '@/mocks/doctor-store';
import { DEMO_SEED_ENABLED } from '@/mocks/demo-mode';
import { DEMO_PATIENTS } from '@/mocks/demo-data/demo-people';
import { findSpecialtyIdByName } from '@/mocks/reference-store';

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
const vitalsBySessionId = new Map<string, ConsultationVitalReading[]>();

const DOCTOR_ID = 'doctor-profile-1';

/**
 * Doctor Profile Redesign (2026-08-02): a handful of realistic reviews for
 * the seeded demo doctor so the redesigned Profile page's Reviews section
 * has real content to render in dev/tests -- same "populate mock/dev
 * fixtures only" precedent as `doctor-store.ts`'s `seedProfile()`. Reviews
 * are no longer anonymous (a later, explicit decision): attributed to the
 * one legacy demo patient (`patient-profile-1` / "Amina Youssef") this mock
 * layer already seeds, never an invented identity.
 */
function seedFeedback(): ConsultationFeedback[] {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  return [
    {
      id: 'feedback-seed-1',
      consultationSessionId: 'session-seed-1',
      doctorId: DOCTOR_ID,
      rating: 5,
      comment: 'Very thorough and took the time to explain my treatment options clearly.',
      createdAt: daysAgo(6),
      patientProfileId: 'patient-profile-1',
      patientName: 'Amina Youssef',
    },
    {
      id: 'feedback-seed-2',
      consultationSessionId: 'session-seed-2',
      doctorId: DOCTOR_ID,
      rating: 5,
      comment: 'Excellent bedside manner and followed up promptly after my test results came in.',
      createdAt: daysAgo(15),
      patientProfileId: 'patient-profile-1',
      patientName: 'Amina Youssef',
    },
    {
      id: 'feedback-seed-3',
      consultationSessionId: 'session-seed-3',
      doctorId: DOCTOR_ID,
      rating: 4,
      comment: 'Good consultation overall, though the wait time was a bit longer than expected.',
      createdAt: daysAgo(29),
      patientProfileId: 'patient-profile-1',
      patientName: 'Amina Youssef',
    },
  ];
}

/**
 * Demo Data & Profile Avatar Pass: a per-doctor review spread, so different
 * doctors genuinely end up with different averages (roughly 4.2-4.9) and
 * different review counts rather than everyone sitting at a flat 5.0 or 0.
 * Psychiatry doctors accumulate the most reviews, matching their heavier
 * booking/completion weighting elsewhere in the demo seed -- the average
 * itself is always the real mean of the seeded ratings below, never a
 * separately-asserted number.
 */
const DEMO_REVIEW_COMMENTS = [
  'Very thorough and took the time to explain my treatment options clearly.',
  'Listened carefully and never made me feel rushed.',
  'Excellent follow-up after my results came back.',
  'Good consultation overall, though the wait was a little longer than expected.',
  'Explained everything in plain language. Would book again.',
  'Professional and reassuring throughout the session.',
  'Helpful advice, and the follow-up plan was clear.',
  'The video call quality made part of the session hard to follow.',
];

function seedDemoFeedback(): ConsultationFeedback[] {
  if (!DEMO_SEED_ENABLED) return [];
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const psychiatryId = findSpecialtyIdByName('Psychiatry');
  const seeded: ConsultationFeedback[] = [];

  listAllDoctorProfiles().forEach((doctor, doctorIndex) => {
    if (doctor.id === DOCTOR_ID) return;
    const isPsychiatry = doctor.specialtyId === psychiatryId;
    const reviewCount = isPsychiatry ? 9 + (doctorIndex % 8) : 3 + (doctorIndex % 4);
    // A deterministic 4.2-4.9 target per doctor, realized as real individual
    // ratings whose mean lands on it -- the aggregate is never hardcoded.
    const lowRatingCount = Math.round(reviewCount * (0.8 - ((doctorIndex * 7) % 8) / 10) * 0.9);
    for (let index = 0; index < reviewCount; index += 1) {
      const reviewer = DEMO_PATIENTS[(doctorIndex + index) % DEMO_PATIENTS.length];
      const reviewerIndex = DEMO_PATIENTS.indexOf(reviewer);
      seeded.push({
        id: `feedback-demo-${doctorIndex + 1}-${index + 1}`,
        consultationSessionId: `session-demo-${doctorIndex + 1}-${index + 1}`,
        doctorId: doctor.id,
        rating: index < lowRatingCount ? 4 : 5,
        comment: DEMO_REVIEW_COMMENTS[(doctorIndex + index) % DEMO_REVIEW_COMMENTS.length],
        createdAt: daysAgo((index + 1) * 4 + doctorIndex),
        patientProfileId: `patient-profile-demo-${reviewerIndex + 1}`,
        patientName: reviewer.displayName,
        patientAvatarUrl: reviewer.avatarUrl,
      });
    }
  });

  return seeded;
}

for (const feedback of [...seedFeedback(), ...seedDemoFeedback()]) {
  feedbackBySessionId.set(feedback.consultationSessionId, feedback);
}

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

function formatVitalValueLabel(type: VitalReadingType, value: number, diastolicValue?: number): string {
  switch (type) {
    case 'weight':
      return `${value} kg`;
    case 'blood-pressure':
      return `${value}/${diastolicValue} mmHg`;
    case 'blood-sugar':
      return `${value} mg/dL`;
  }
}

export function recordConsultationVital(
  consultationSessionId: string,
  type: VitalReadingType,
  value: number,
  diastolicValue?: number,
): ConsultationVitalReading {
  const reading: ConsultationVitalReading = {
    id: `vital-${Date.now()}-${type}`,
    type,
    recordedAt: new Date().toISOString(),
    valueLabel: formatVitalValueLabel(type, value, diastolicValue),
    value,
    diastolicValue,
  };
  vitalsBySessionId.set(consultationSessionId, [...(vitalsBySessionId.get(consultationSessionId) ?? []), reading]);
  return reading;
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
      doctorId: appointment?.doctorId ?? DOCTOR_ID,
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
    vitalReadings: vitalsBySessionId.get(consultationSessionId) ?? [],
    followUpRecommendation: followUpBySessionId.get(consultationSessionId) ?? null,
    feedback: feedbackBySessionId.get(consultationSessionId) ?? null,
  };
}

export function submitConsultationFeedback(
  consultationSessionId: string,
  rating: number,
  comment: string | undefined,
): ConsultationFeedback {
  const reviewer = getPatientProfile();
  const feedback: ConsultationFeedback = {
    id: `feedback-${Date.now()}`,
    consultationSessionId,
    // Demo Data & Profile Avatar Pass: credit the review to the doctor the
    // consultation was actually with, so a demo patient rating any of the 20
    // doctors moves that doctor's own average -- not always the legacy one.
    doctorId: findAppointmentBySessionId(consultationSessionId)?.doctorId ?? DOCTOR_ID,
    rating,
    comment: comment ?? null,
    createdAt: new Date().toISOString(),
    // The real submitting patient, not a placeholder -- matches the real
    // backend crediting the review to the JWT-authenticated caller.
    patientProfileId: reviewer?.id ?? 'patient-profile-1',
    patientName: reviewer?.fullName ?? 'Amina Youssef',
    patientAvatarUrl: reviewer?.avatarUrl,
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
    return { reviews: [], total: 0, page, limit, averageRating: null, reviewCount: 0, writtenReviewCount: 0 };
  }
  const reviews = Array.from(feedbackBySessionId.values()).filter((review) => review.doctorId === doctorProfileId);
  const reviewCount = reviews.length;
  const writtenReviewCount = reviews.filter((review) => review.comment).length;
  const averageRating =
    reviewCount === 0 ? null : reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount;
  const start = (page - 1) * limit;
  return {
    reviews: reviews.slice(start, start + limit),
    total: reviewCount,
    page,
    limit,
    averageRating,
    reviewCount,
    writtenReviewCount,
  };
}

/**
 * Test-only: empties the feedback/reviews store without reseeding --
 * for a test that needs to prove the genuine "zero reviews" case still
 * renders honestly (e.g. `PopularDoctorsSection`'s handler reads this store
 * directly rather than through the `/doctors/:id/reviews` HTTP route, so an
 * MSW handler override alone can't simulate "no reviews" for it). Never
 * called from application code.
 */
export function clearFeedbackForTests(): void {
  feedbackBySessionId.clear();
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetConsultationStore(): void {
  sessions.clear();
  feedbackBySessionId.clear();
  followUpBySessionId.clear();
  notesBySessionId.clear();
  diagnosesBySessionId.clear();
  vitalsBySessionId.clear();
  for (const feedback of [...seedFeedback(), ...seedDemoFeedback()]) {
    feedbackBySessionId.set(feedback.consultationSessionId, feedback);
  }
}
