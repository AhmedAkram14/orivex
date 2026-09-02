import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import type { ConsultationCompletionReason } from '@/features/consultation/api/types';
import type { VitalReadingType } from '@/features/consultation/api/types';
import {
  closeConsultation,
  deleteConsultationFeedback,
  getConsultationSummary,
  getDoctorReviews,
  recommendFollowUp,
  recordConsultationDiagnosis,
  recordConsultationNote,
  recordConsultationVital,
  startConsultation,
  submitConsultationFeedback,
  updateConsultationFeedback,
} from '@/mocks/consultation-store';

const base = () => env.apiBaseUrl;

/**
 * Real backend endpoints (ConsultationModule's start/close/feedback/follow-up
 * controllers, ClinicalModule's summary/diagnosis/notes controllers --
 * consultation-completion follow-up work). Prescriptions are always returned
 * empty by `getConsultationSummary()` (see `consultation-store.ts`'s own doc
 * comment) since this mock has no prescription-sign store to write into.
 */
export const consultationHandlers = [
  http.post(`${base()}/consultations/:id/start`, ({ params }) =>
    HttpResponse.json({ data: startConsultation(params.id as string) }),
  ),

  http.post(`${base()}/consultations/:id/close`, async ({ request, params }) => {
    const body = (await request.json()) as { completionReason: ConsultationCompletionReason };
    return HttpResponse.json({ data: closeConsultation(params.id as string, body.completionReason) });
  }),

  http.get(`${base()}/consultations/:id/summary`, ({ params }) =>
    HttpResponse.json({ data: getConsultationSummary(params.id as string) }),
  ),

  http.post(`${base()}/consultations/:id/feedback`, async ({ request, params }) => {
    const body = (await request.json()) as { rating: number; comment?: string };
    return HttpResponse.json(
      { data: submitConsultationFeedback(params.id as string, body.rating, body.comment) },
      { status: 201 },
    );
  }),

  http.patch(`${base()}/consultations/:id/feedback`, async ({ request, params }) => {
    const body = (await request.json()) as { rating: number; comment?: string };
    const updated = updateConsultationFeedback(params.id as string, body.rating, body.comment);
    if (!updated) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No feedback exists for this session.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: updated });
  }),

  http.delete(`${base()}/consultations/:id/feedback`, ({ params }) => {
    deleteConsultationFeedback(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base()}/consultations/:id/follow-up`, async ({ request, params }) => {
    const body = (await request.json()) as { reason: string; recommendedDate?: string };
    return HttpResponse.json(
      { data: recommendFollowUp(params.id as string, body.reason, body.recommendedDate) },
      { status: 201 },
    );
  }),

  http.post(`${base()}/consultations/:id/diagnosis`, async ({ request, params }) => {
    const body = (await request.json()) as {
      freeTextDescription: string;
      certaintyLevel?: 'suspected' | 'confirmed' | 'ruled_out';
    };
    return HttpResponse.json(
      { data: { node: recordConsultationDiagnosis(params.id as string, body.freeTextDescription, body.certaintyLevel) } },
      { status: 201 },
    );
  }),

  http.post(`${base()}/consultations/:id/notes`, async ({ request, params }) => {
    const body = (await request.json()) as { content: string };
    return HttpResponse.json({ data: recordConsultationNote(params.id as string, body.content) }, { status: 201 });
  }),

  http.post(`${base()}/consultations/:id/vitals`, async ({ request, params }) => {
    const body = (await request.json()) as { type: VitalReadingType; value: number; diastolicValue?: number };
    return HttpResponse.json(
      { data: recordConsultationVital(params.id as string, body.type, body.value, body.diastolicValue) },
      { status: 201 },
    );
  }),

  http.get(`${base()}/doctors/:id/reviews`, ({ params, request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    return HttpResponse.json({ data: getDoctorReviews(params.id as string, page, limit) });
  }),
];
