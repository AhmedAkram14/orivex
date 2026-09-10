import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import {
  authorArticle,
  findArticleById,
  followDoctor,
  listArticlesByStatus,
  listFollowedDoctors,
  listMyArticles,
  listPublishedArticles,
  listSavedArticles,
  moderateArticle,
  saveArticle,
  unfollowDoctor,
  unsaveArticle,
} from '@/mocks/knowledge-store';
import { getDoctorByAccountId } from '@/mocks/doctor-store';
import { getProfile as getPatientProfile } from '@/mocks/patient-store';
import { resolveRequestAccountId } from '@/mocks/request-account';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import type { KnowledgeArticleStatus } from '@/features/knowledge/api/types';

const base = () => env.apiBaseUrl;

function notFound(message: string) {
  return HttpResponse.json(
    { error: { code: 'NOT_FOUND', message, requestId: 'mock', timestamp: new Date().toISOString() } },
    { status: 404 },
  );
}

function forbidden(message: string) {
  return HttpResponse.json(
    { error: { code: 'FORBIDDEN', message, requestId: 'mock', timestamp: new Date().toISOString() } },
    { status: 403 },
  );
}

/**
 * I13 -- Knowledge Center (docs/01.1-prd-update.md §6). Matches
 * KnowledgeController's own `@Controller('knowledge')` routes exactly --
 * mirrors `consultation.ts`'s dispute-handler pattern for auth resolution.
 */
export const knowledgeHandlers = [
  http.post(`${base()}/knowledge/articles`, async ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_DOCTOR_ACCOUNT_ID;
    const body = (await request.json()) as { title: string; body: string };
    const result = authorArticle(accountId, body.title, body.body);
    if (!result.ok) {
      return result.reason === 'not_verified'
        ? forbidden('Only a Syndicate-verified doctor may publish Knowledge Center content.')
        : notFound('No doctor profile exists for this account.');
    }
    return HttpResponse.json({ data: result.article }, { status: 201 });
  }),

  http.get(`${base()}/knowledge/articles/mine`, ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_DOCTOR_ACCOUNT_ID;
    return HttpResponse.json({ data: listMyArticles(accountId) });
  }),

  http.get(`${base()}/knowledge/articles`, ({ request }) => {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId') ?? undefined;
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const all = listPublishedArticles(doctorId);
    const start = (page - 1) * limit;
    return HttpResponse.json({
      data: { articles: all.slice(start, start + limit), total: all.length, page, limit },
    });
  }),

  http.get(`${base()}/knowledge/articles/:id`, ({ params, request }) => {
    const article = findArticleById(params.id as string);
    if (!article) return notFound('KnowledgeArticle not found.');
    if (article.status === 'published') return HttpResponse.json({ data: article });

    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const doctorProfile = getDoctorByAccountId(accountId);
    if (!doctorProfile || doctorProfile.id !== article.authoringDoctorId) {
      return notFound('KnowledgeArticle not found.');
    }
    return HttpResponse.json({ data: article });
  }),

  http.post(`${base()}/knowledge/articles/:id/save`, ({ params, request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const patientProfile = getPatientProfile(accountId);
    if (!patientProfile) return notFound('No patient profile exists for this account.');
    return HttpResponse.json({ data: saveArticle(patientProfile.id, params.id as string) }, { status: 201 });
  }),

  http.delete(`${base()}/knowledge/articles/:id/save`, ({ params, request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const patientProfile = getPatientProfile(accountId);
    if (patientProfile) unsaveArticle(patientProfile.id, params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}/knowledge/saved-articles`, ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const patientProfile = getPatientProfile(accountId);
    return HttpResponse.json({ data: patientProfile ? listSavedArticles(patientProfile.id) : [] });
  }),

  http.post(`${base()}/knowledge/doctors/:doctorId/follow`, ({ params, request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const patientProfile = getPatientProfile(accountId);
    if (!patientProfile) return notFound('No patient profile exists for this account.');
    return HttpResponse.json({ data: followDoctor(patientProfile.id, params.doctorId as string) }, { status: 201 });
  }),

  http.delete(`${base()}/knowledge/doctors/:doctorId/follow`, ({ params, request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const patientProfile = getPatientProfile(accountId);
    if (patientProfile) unfollowDoctor(patientProfile.id, params.doctorId as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base()}/knowledge/followed-doctors`, ({ request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const patientProfile = getPatientProfile(accountId);
    return HttpResponse.json({ data: patientProfile ? listFollowedDoctors(patientProfile.id) : [] });
  }),

  // Admin moderation -- matches AdministrationController's own
  // `knowledge/articles` routes exactly.
  http.get(`${base()}/admin/knowledge/articles`, ({ request }) => {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') as KnowledgeArticleStatus | null) ?? 'pending_review';
    return HttpResponse.json({ data: listArticlesByStatus(status) });
  }),

  http.patch(`${base()}/admin/knowledge/articles/:id/moderate`, async ({ params, request }) => {
    const accountId = resolveRequestAccountId(request) ?? LEGACY_PATIENT_ACCOUNT_ID;
    const body = (await request.json()) as { status: 'published' | 'rejected' | 'archived'; reason: string };
    const updated = moderateArticle(params.id as string, body.status, body.reason, accountId);
    if (!updated) return notFound('KnowledgeArticle not found.');
    return HttpResponse.json({ data: updated });
  }),
];
