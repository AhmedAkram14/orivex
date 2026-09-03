import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Matches src/mocks/auth-store.ts's MOCK_ACCOUNTS exactly -- these are the
// only credentials the MSW-backed /auth/login handler ever accepts.
export const MOCK_CREDENTIALS = {
  patient: { email: 'patient@orivex.dev', password: 'Password123!', fullName: 'Amina Youssef' },
  doctor: { email: 'doctor@orivex.dev', password: 'Password123!', fullName: 'Dr. Sarah Ahmed' },
  admin: { email: 'admin@orivex.dev', password: 'Password123!', fullName: 'Layla Mansour' },
} as const;

// Login always pushes to the shared /en/dashboard first (login-form.tsx),
// but DashboardPage itself immediately redirects onward, client-side, to
// each role's real workspace home once role/journey status resolves --
// patient@orivex.dev is always a fully-onboarded mock profile
// (patient-store.ts), so it always lands on /patient, never /journey or
// /patient/intake. /dashboard is a transient hop, not a stable landing
// spot, so wait for the real destination rather than racing it.
const WORKSPACE_HOME: Record<keyof typeof MOCK_CREDENTIALS, RegExp> = {
  patient: /\/en\/patient$/,
  doctor: /\/en\/doctor$/,
  admin: /\/en\/admin$/,
};

export async function loginAs(page: Page, role: keyof typeof MOCK_CREDENTIALS): Promise<void> {
  const { email, password } = MOCK_CREDENTIALS[role];

  await page.goto('/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(WORKSPACE_HOME[role]);
}
