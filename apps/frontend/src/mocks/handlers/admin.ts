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
];
