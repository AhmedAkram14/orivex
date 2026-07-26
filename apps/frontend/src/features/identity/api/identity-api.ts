import { apiFetch } from '@/shared/lib/api/client';
import { IDENTITY_PATHS } from '@/features/identity/api/paths';
import type { Account, UpdatePersonalProfileRequest } from '@/features/identity/api/types';

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.1/O.6): thin typed
 * wrapper over `apiFetch`, mirroring `doctorApi`/`patientApi`'s shape. The
 * only module that talks to `/accounts/me` -- the shared Personal Info
 * step both Doctor Onboarding and the future Patient Profile Editor submit
 * through.
 */
export const identityApi = {
  getMyAccount: () => apiFetch<Account>({ path: IDENTITY_PATHS.myAccount }),

  updateMyPersonalProfile: (request: UpdatePersonalProfileRequest) =>
    apiFetch<Account>({ method: 'PATCH', path: IDENTITY_PATHS.myAccount, body: request }),

  // Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8):
  // SuperAdmin-only lookup, backing the verification case-detail page.
  getAccountById: (id: string) => apiFetch<Account>({ path: IDENTITY_PATHS.byId(id) }),
};
