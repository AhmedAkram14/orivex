import { apiFetch } from '@/shared/lib/api/client';
import { ADMIN_PATHS } from '@/features/admin/api/paths';
import type { Role } from '@/shared/auth/types';
import type { PaymentTransaction } from '@/features/payment/api/types';
import type {
  AdminAccount,
  CreateDepartmentRequest,
  CreateHospitalRequest,
  Department,
  FeatureFlags,
  Hospital,
  ListAccountsParams,
  ListAccountsResult,
  ListAdminPaymentTransactionsParams,
  ListAdminPaymentTransactionsResult,
  PlatformKpis,
  ReviewVerificationCaseRequest,
  SecurityEvent,
  SuspendVerificationCaseRequest,
  VerificationCase,
  VerificationQueueParams,
} from '@/features/admin/api/types';

function buildVerificationQueueQuery(params: VerificationQueueParams): string {
  const query = new URLSearchParams();
  if (params.subjectType) query.set('subjectType', params.subjectType);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return qs ? `${ADMIN_PATHS.verificationQueue}?${qs}` : ADMIN_PATHS.verificationQueue;
}

function buildAccountsQuery(params: ListAccountsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.role) query.set('role', params.role);
  const qs = query.toString();
  return qs ? `${ADMIN_PATHS.accounts}?${qs}` : ADMIN_PATHS.accounts;
}

function buildPaymentsQuery(params: ListAdminPaymentTransactionsParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return qs ? `${ADMIN_PATHS.payments}?${qs}` : ADMIN_PATHS.payments;
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

  getVerificationQueue: (params: VerificationQueueParams = {}) =>
    apiFetch<VerificationCase[]>({ path: buildVerificationQueueQuery(params) }),

  getVerificationCase: (id: string) => apiFetch<VerificationCase>({ path: ADMIN_PATHS.verificationCase(id) }),

  getVerificationCaseHistory: (id: string) =>
    apiFetch<VerificationCase[]>({ path: ADMIN_PATHS.verificationCaseHistory(id) }),

  reviewVerificationCase: (id: string, request: ReviewVerificationCaseRequest) =>
    apiFetch<VerificationCase>({ method: 'PATCH', path: ADMIN_PATHS.reviewVerificationCase(id), body: request }),

  suspendVerificationCase: (id: string, request: SuspendVerificationCaseRequest) =>
    apiFetch<VerificationCase>({ method: 'PATCH', path: ADMIN_PATHS.suspendVerificationCase(id), body: request }),

  getFeatureFlags: () => apiFetch<FeatureFlags>({ path: ADMIN_PATHS.featureFlags }),

  // ORIVEX Roadmap Phase 3, Critical Lifecycle Gaps, Step 4: SuperAdmin's
  // payment transaction list/refund, extending the previously
  // read-only-analytics admin payment surface. `refundPayment` calls the
  // same real RefundPaymentUseCase the doctor-facing `paymentApi.refund`
  // does, just through the SuperAdmin-gated route -- the response shape is
  // the full `PaymentTransaction` (not the admin list row), matching
  // AdminPaymentTransactionResponseDto's backend sibling exactly.
  listPayments: (params: ListAdminPaymentTransactionsParams = {}) =>
    apiFetch<ListAdminPaymentTransactionsResult>({ path: buildPaymentsQuery(params) }),

  refundPayment: (id: string) =>
    apiFetch<PaymentTransaction>({ method: 'POST', path: ADMIN_PATHS.refundPayment(id) }),
};
