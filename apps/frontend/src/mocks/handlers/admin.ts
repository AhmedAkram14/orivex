import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { ADMIN_PATHS } from '@/features/admin/api/paths';
import type {
  CreateDepartmentRequest,
  CreateHospitalRequest,
  ListAccountsParams,
  ReviewVerificationCaseRequest,
  SuspendVerificationCaseRequest,
  VerificationCaseStatus,
  VerificationSubjectType,
} from '@/features/admin/api/types';
import type { Role } from '@/shared/auth/types';
import {
  createDepartment,
  createHospital,
  getAuditLog,
  getFeatureFlags,
  getPlatformKpis,
  getSecurityEventsForAccount,
  getVerificationCase,
  getVerificationCaseHistory,
  getVerificationQueue,
  listAccounts,
  listDepartments,
  listHospitals,
  reviewVerificationCase,
  suspendVerificationCase,
  updateAccountRole,
} from '@/mocks/admin-store';
import { listAllTransactionsForAdmin, refundTransaction } from '@/mocks/payment-store';
import { listConsultationFeedbackByModerationStatus, moderateConsultationFeedback } from '@/mocks/consultation-store';
import { listDisputesByStatus, resolveDispute } from '@/mocks/disputes-store';
import { resolveRequestAccountId } from '@/mocks/request-account';
import { LEGACY_DOCTOR_ACCOUNT_ID } from '@/mocks/auth-store';

const base = () => env.apiBaseUrl;

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message, requestId: 'mock-request', timestamp: new Date().toISOString() } },
    { status },
  );
}

/**
 * Every route below is a real endpoint (AdministrationModule's
 * AdministrationController, ORIVEX Roadmap 2.0 Stage 4 / Onboarding
 * Redesign Stage O.8) -- these handlers exist purely to keep the frontend
 * test suite deterministic, matching `scheduling.ts`'s own precedent.
 */
export const adminHandlers = [
  http.get(`${base()}${ADMIN_PATHS.kpis}`, () => HttpResponse.json({ data: getPlatformKpis() })),

  http.get(`${base()}${ADMIN_PATHS.accounts}`, ({ request }) => {
    const url = new URL(request.url);
    const params: ListAccountsParams = {
      page: url.searchParams.has('page') ? Number(url.searchParams.get('page')) : undefined,
      limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : undefined,
      role: (url.searchParams.get('role') as Role | null) ?? undefined,
    };
    return HttpResponse.json({ data: listAccounts(params) });
  }),

  http.patch(`${base()}/admin/accounts/:id/role`, async ({ request, params }) => {
    const body = (await request.json()) as { role: Role };
    const updated = updateAccountRole(params.id as string, body.role);
    if (!updated) return errorResponse(404, 'NOT_FOUND', 'Account not found.');
    return HttpResponse.json({ data: updated });
  }),

  http.get(`${base()}/admin/accounts/:id/security-events`, ({ params }) =>
    HttpResponse.json({ data: getSecurityEventsForAccount(params.id as string) }),
  ),

  http.get(`${base()}${ADMIN_PATHS.hospitals}`, () => HttpResponse.json({ data: listHospitals() })),

  http.post(`${base()}${ADMIN_PATHS.hospitals}`, async ({ request }) => {
    const body = (await request.json()) as CreateHospitalRequest;
    return HttpResponse.json({ data: createHospital(body) }, { status: 201 });
  }),

  http.get(`${base()}/admin/hospitals/:id/departments`, ({ params }) => {
    const result = listDepartments(params.id as string);
    if (!result.ok) return errorResponse(404, 'NOT_FOUND', 'Hospital not found.');
    return HttpResponse.json({ data: result.departments });
  }),

  http.post(`${base()}/admin/hospitals/:id/departments`, async ({ request, params }) => {
    const body = (await request.json()) as CreateDepartmentRequest;
    const result = createDepartment(params.id as string, body);
    if (!result.ok) return errorResponse(404, 'NOT_FOUND', 'Hospital not found.');
    return HttpResponse.json({ data: result.department }, { status: 201 });
  }),

  http.get(`${base()}${ADMIN_PATHS.verificationQueue}`, ({ request }) => {
    const url = new URL(request.url);
    const subjectType = (url.searchParams.get('subjectType') as VerificationSubjectType | null) ?? undefined;
    const status = (url.searchParams.get('status') as VerificationCaseStatus | null) ?? undefined;
    return HttpResponse.json({ data: getVerificationQueue({ subjectType, status }) });
  }),

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
  // registered before `/admin/verification-queue/:id` below so the two
  // literal sub-paths (`/suspend`, `/history`) always win the match.
  http.patch(`${base()}/admin/verification-queue/:id/suspend`, async ({ request, params }) => {
    const body = (await request.json()) as SuspendVerificationCaseRequest;
    const result = suspendVerificationCase(params.id as string, body);
    if (!result.ok) return errorResponse(404, 'NOT_FOUND', 'Verification case not found.');
    return HttpResponse.json({ data: result.verificationCase });
  }),

  http.get(`${base()}/admin/verification-queue/:id/history`, ({ params }) =>
    HttpResponse.json({ data: getVerificationCaseHistory(params.id as string) }),
  ),

  http.get(`${base()}/admin/verification-queue/:id`, ({ params }) => {
    const found = getVerificationCase(params.id as string);
    if (!found) return errorResponse(404, 'NOT_FOUND', 'Verification case not found.');
    return HttpResponse.json({ data: found });
  }),

  http.patch(`${base()}/admin/verification-queue/:id`, async ({ request, params }) => {
    const body = (await request.json()) as ReviewVerificationCaseRequest;
    const result = reviewVerificationCase(params.id as string, body);
    if (!result.ok) return errorResponse(404, 'NOT_FOUND', 'Verification case not found.');
    return HttpResponse.json({ data: result.verificationCase });
  }),

  http.get(`${base()}${ADMIN_PATHS.featureFlags}`, () => HttpResponse.json({ data: getFeatureFlags() })),

  // ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: SuperAdmin's
  // payment transaction list/refund -- registered before the doctor-facing
  // `/payments/:id/refund` handler in handlers/payment.ts would ever match
  // (distinct `/admin/payments` prefix, no path collision).
  http.get(`${base()}${ADMIN_PATHS.payments}`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
    const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50;
    const result = listAllTransactionsForAdmin(page, limit);
    return HttpResponse.json({ data: { ...result, page, limit } });
  }),

  http.post(`${base()}/admin/payments/:id/refund`, ({ params }) => {
    const result = refundTransaction(params.id as string);
    if (result.outcome === 'not-found') {
      return errorResponse(404, 'NOT_FOUND', 'PaymentTransaction not found.');
    }
    if (result.outcome === 'already-refunded') {
      return errorResponse(422, 'VALIDATION_FAILED', 'This transaction has already been refunded.');
    }
    return HttpResponse.json({ data: result.transaction });
  }),

  // I11 -- Admin audit-log viewer.
  http.get(`${base()}${ADMIN_PATHS.auditLog}`, () => HttpResponse.json({ data: getAuditLog() })),

  // I11 -- Admin content moderation.
  http.get(`${base()}${ADMIN_PATHS.reviews}`, ({ request }) => {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') ?? 'flagged') as 'visible' | 'flagged' | 'hidden';
    return HttpResponse.json({ data: listConsultationFeedbackByModerationStatus(status) });
  }),

  http.patch(`${base()}/admin/reviews/:id/moderate`, async ({ request, params }) => {
    const body = (await request.json()) as { status: 'visible' | 'hidden'; reason: string };
    const moderatorAccountId = resolveRequestAccountId(request) ?? LEGACY_DOCTOR_ACCOUNT_ID;
    const updated = moderateConsultationFeedback(params.id as string, body.status, body.reason, moderatorAccountId);
    if (!updated) {
      return errorResponse(404, 'NOT_FOUND', 'ConsultationFeedback not found.');
    }
    return HttpResponse.json({ data: updated });
  }),

  // I11 -- Admin dispute resolution.
  http.get(`${base()}${ADMIN_PATHS.disputes}`, ({ request }) => {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') ?? 'open') as 'open' | 'resolved' | 'dismissed';
    return HttpResponse.json({ data: listDisputesByStatus(status) });
  }),

  http.patch(`${base()}/admin/disputes/:id/resolve`, async ({ request, params }) => {
    const body = (await request.json()) as { status: 'resolved' | 'dismissed'; resolutionNotes: string };
    const moderatorAccountId = resolveRequestAccountId(request) ?? LEGACY_DOCTOR_ACCOUNT_ID;
    const updated = resolveDispute(params.id as string, body.status, body.resolutionNotes, moderatorAccountId);
    if (!updated) {
      return errorResponse(404, 'NOT_FOUND', 'Dispute not found.');
    }
    return HttpResponse.json({ data: updated });
  }),
];
