import { apiFetch } from '@/shared/lib/api/client';
import { ADMIN_PATHS } from '@/features/admin/api/paths';
import type { Role } from '@/shared/auth/types';
import type {
  AdminAccount,
  CreateDepartmentRequest,
  CreateHospitalRequest,
  Department,
  FeatureFlags,
  Hospital,
  ListAccountsParams,
  ListAccountsResult,
  PlatformKpis,
  ReviewVerificationCaseRequest,
  SecurityEvent,
  VerificationCase,
} from '@/features/admin/api/types';

function buildAccountsQuery(params: ListAccountsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.role) query.set('role', params.role);
  const qs = query.toString();
  return qs ? `${ADMIN_PATHS.accounts}?${qs}` : ADMIN_PATHS.accounts;
}

/**
 * The only module that talks to `/admin/*` — mirrors `schedulingApi`'s
 * shape. Every route is a real backend endpoint (AdministrationModule's
 * AdministrationController, ORIVEX Roadmap 2.0 Stage 4).
 */
export const adminApi = {
  getKpis: () => apiFetch<PlatformKpis>({ path: ADMIN_PATHS.kpis }),

  listAccounts: (params: ListAccountsParams = {}) =>
    apiFetch<ListAccountsResult>({ path: buildAccountsQuery(params) }),

  updateAccountRole: (accountId: string, role: Role) =>
    apiFetch<AdminAccount>({ method: 'PATCH', path: ADMIN_PATHS.accountRole(accountId), body: { role } }),

  getSecurityEventsForAccount: (accountId: string) =>
    apiFetch<SecurityEvent[]>({ path: ADMIN_PATHS.securityEventsForAccount(accountId) }),

  listHospitals: () => apiFetch<Hospital[]>({ path: ADMIN_PATHS.hospitals }),

  createHospital: (request: CreateHospitalRequest) =>
    apiFetch<Hospital>({ method: 'POST', path: ADMIN_PATHS.hospitals, body: request }),

  listDepartments: (hospitalId: string) => apiFetch<Department[]>({ path: ADMIN_PATHS.departments(hospitalId) }),

  createDepartment: (hospitalId: string, request: CreateDepartmentRequest) =>
    apiFetch<Department>({ method: 'POST', path: ADMIN_PATHS.departments(hospitalId), body: request }),

  getVerificationQueue: () => apiFetch<VerificationCase[]>({ path: ADMIN_PATHS.verificationQueue }),

  reviewVerificationCase: (id: string, request: ReviewVerificationCaseRequest) =>
    apiFetch<VerificationCase>({ method: 'PATCH', path: ADMIN_PATHS.reviewVerificationCase(id), body: request }),

  getFeatureFlags: () => apiFetch<FeatureFlags>({ path: ADMIN_PATHS.featureFlags }),
};
