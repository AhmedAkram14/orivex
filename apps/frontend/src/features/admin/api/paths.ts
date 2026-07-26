/** Path constants for `/admin/*` — mirrors `features/scheduling/api/paths.ts`'s convention exactly. Real backend routes (AdministrationModule's AdministrationController, ORIVEX Roadmap 2.0 Stage 4). */
export const ADMIN_PATHS = {
  kpis: '/admin/kpis',
  accounts: '/admin/accounts',
  accountRole: (id: string) => `/admin/accounts/${id}/role`,
  securityEventsForAccount: (id: string) => `/admin/accounts/${id}/security-events`,
  hospitals: '/admin/hospitals',
  departments: (hospitalId: string) => `/admin/hospitals/${hospitalId}/departments`,
  verificationQueue: '/admin/verification-queue',
  verificationCase: (id: string) => `/admin/verification-queue/${id}`,
  reviewVerificationCase: (id: string) => `/admin/verification-queue/${id}`,
  suspendVerificationCase: (id: string) => `/admin/verification-queue/${id}/suspend`,
  verificationCaseHistory: (id: string) => `/admin/verification-queue/${id}/history`,
  featureFlags: '/admin/feature-flags',
} as const;
