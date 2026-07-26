import type { Account, UpdatePersonalProfileRequest } from '@/features/identity/api/types';

/**
 * In-memory mock "backend" state for `/accounts/me` -- mirrors
 * `patient-store.ts`'s pattern. `GET/PATCH /accounts/me` is a real backend
 * endpoint (IdentityModule's MyAccountController); this store exists purely
 * to keep the frontend test suite deterministic (Onboarding Redesign,
 * 2026-07-21 proposal, Stage O.1/O.6 -- the shared Personal Info step both
 * Doctor Onboarding and the future Patient Profile Editor submit through).
 */
function seedAccount(): Account {
  const now = new Date().toISOString();
  return {
    id: 'user-patient-1',
    email: 'patient@orivex.dev',
    role: 'patient',
    status: 'active',
    displayName: 'Amina Youssef',
    preferredLanguage: 'en',
    dateOfBirth: '1990-04-12',
    gender: 'female',
    nationalityId: 'country-eg',
    address: '12 Tahrir Street, Cairo',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): a
 * small, separate by-id registry backing the real, admin-only
 * `GET /accounts/:id` (IdentityModule's AccountController) -- distinct from
 * the single mutable `/accounts/me` record above, since the admin
 * verification case-detail page must resolve *any* subjectAccountId, not
 * just the current caller's own. `user-doctor-1`/`user-patient-1` match
 * `auth-store.ts`'s own seeded session account ids exactly, so a
 * verification case submitted by either seeded demo account resolves to a
 * real-looking applicant identity.
 */
function seedAccountsById(): Record<string, Account> {
  const now = new Date().toISOString();
  return {
    'user-patient-1': {
      id: 'user-patient-1',
      email: 'patient@orivex.dev',
      role: 'patient',
      status: 'active',
      displayName: 'Amina Youssef',
      phoneNumber: '+20 100 111 2222',
      preferredLanguage: 'en',
      dateOfBirth: '1990-04-12',
      gender: 'female',
      nationalityId: 'country-eg',
      address: '12 Tahrir Street, Cairo',
      createdAt: now,
      updatedAt: now,
    },
    'user-doctor-1': {
      id: 'user-doctor-1',
      email: 'doctor@orivex.dev',
      role: 'doctor',
      status: 'active',
      displayName: 'Dr. Sarah Ahmed',
      phoneNumber: '+20 100 222 3333',
      preferredLanguage: 'en',
      dateOfBirth: '1985-06-15',
      gender: 'female',
      nationalityId: 'country-eg',
      address: '4 Corniche El Nil, Cairo',
      createdAt: now,
      updatedAt: now,
    },
  };
}

let account: Account = seedAccount();
let accountsById: Record<string, Account> = seedAccountsById();

export function getMyAccount(): Account {
  return account;
}

export function updateMyPersonalProfile(request: UpdatePersonalProfileRequest): Account {
  account = {
    ...account,
    dateOfBirth: request.dateOfBirth ?? account.dateOfBirth,
    gender: request.gender ?? account.gender,
    nationalityId: request.nationalityId ?? account.nationalityId,
    address: request.address ?? account.address,
    updatedAt: new Date().toISOString(),
  };
  if (accountsById[account.id]) {
    accountsById = { ...accountsById, [account.id]: account };
  }
  return account;
}

export function getAccountById(id: string): Account | undefined {
  return accountsById[id] ?? (account.id === id ? account : undefined);
}

/** Test-only: restores the seed state. Never called from application code. */
export function resetIdentityStore(): void {
  account = seedAccount();
  accountsById = seedAccountsById();
}
