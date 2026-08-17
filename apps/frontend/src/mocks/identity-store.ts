import type { Account, UpdatePersonalProfileRequest } from '@/features/identity/api/types';
import {
  findAccountById,
  getCurrentAccountId,
  LEGACY_DOCTOR_ACCOUNT_ID,
  LEGACY_PATIENT_ACCOUNT_ID,
} from '@/mocks/auth-store';
import { DEMO_SEED_ENABLED } from '@/mocks/demo-mode';
import { DEMO_DOCTORS, DEMO_HOSPITAL_ADMIN, DEMO_PATIENTS, DEMO_SUPER_ADMIN } from '@/mocks/demo-data/demo-people';

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
    id: LEGACY_PATIENT_ACCOUNT_ID,
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
    [LEGACY_PATIENT_ACCOUNT_ID]: {
      id: LEGACY_PATIENT_ACCOUNT_ID,
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
    [LEGACY_DOCTOR_ACCOUNT_ID]: {
      id: LEGACY_DOCTOR_ACCOUNT_ID,
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

/**
 * Demo Data & Profile Avatar Pass: the by-id registry now also carries every
 * demo person, so the admin verification case-detail page can resolve a real
 * applicant identity for any of the 42 demo accounts -- not just the two
 * legacy personas. Derived from `auth-store.ts`'s own accounts and
 * `demo-people.ts` rather than transcribed a third time.
 */
function seedDemoAccountsById(): Record<string, Account> {
  if (!DEMO_SEED_ENABLED) return {};
  const now = new Date().toISOString();
  const entries: Account[] = [
    ...DEMO_DOCTORS.map((doctor, index) => ({
      id: doctor.accountId,
      email: doctor.email,
      role: 'doctor' as const,
      status: 'active' as const,
      displayName: doctor.displayName,
      phoneNumber: `+20 12${(index + 10).toString().padStart(2, '0')} ${(index + 1).toString().padStart(3, '0')} 4400`,
      preferredLanguage: 'en',
      gender: doctor.gender,
      nationalityId: 'country-eg',
      createdAt: now,
      updatedAt: now,
    })),
    ...DEMO_PATIENTS.map((patient, index) => ({
      id: patient.accountId,
      email: patient.email,
      role: 'patient' as const,
      status: 'active' as const,
      displayName: patient.displayName,
      phoneNumber: `+20 11${(index + 10).toString().padStart(2, '0')} ${(index + 1).toString().padStart(3, '0')} 7700`,
      preferredLanguage: 'en',
      gender: patient.gender,
      dateOfBirth: `${new Date().getFullYear() - patient.dateOfBirthYearsAgo}-0${(index % 9) + 1}-1${index % 10}`,
      nationalityId: 'country-eg',
      createdAt: now,
      updatedAt: now,
    })),
    {
      id: DEMO_SUPER_ADMIN.accountId,
      email: DEMO_SUPER_ADMIN.email,
      role: 'super_admin' as const,
      status: 'active' as const,
      displayName: DEMO_SUPER_ADMIN.displayName,
      preferredLanguage: 'en',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_HOSPITAL_ADMIN.accountId,
      email: DEMO_HOSPITAL_ADMIN.email,
      role: 'hospital_admin' as const,
      status: 'active' as const,
      displayName: DEMO_HOSPITAL_ADMIN.displayName,
      preferredLanguage: 'en',
      createdAt: now,
      updatedAt: now,
    },
  ];
  return Object.fromEntries(entries.map((entry) => [entry.id, entry]));
}

let account: Account = seedAccount();
let accountsById: Record<string, Account> = { ...seedDemoAccountsById(), ...seedAccountsById() };

/**
 * `GET /accounts/me` is genuinely per-caller now: it resolves the account
 * backing the request (see `request-account.ts`) instead of always returning
 * the one hardcoded legacy record. Falls back to that legacy record when no
 * account can be resolved, keeping the existing no-session tests unchanged.
 */
export function getMyAccount(accountId?: string): Account {
  const resolved = accountId ?? getCurrentAccountId();
  if (!resolved || resolved === account.id) return account;
  return accountsById[resolved] ?? fallbackAccountFor(resolved) ?? account;
}

function fallbackAccountFor(accountId: string): Account | undefined {
  const mockAccount = findAccountById(accountId);
  if (!mockAccount) return undefined;
  const now = new Date().toISOString();
  return {
    id: mockAccount.id,
    email: mockAccount.email,
    role: mockAccount.roles[0],
    status: 'active',
    displayName: mockAccount.fullName,
    preferredLanguage: 'en',
    createdAt: now,
    updatedAt: now,
  };
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
  accountsById = { ...seedDemoAccountsById(), ...seedAccountsById() };
}
