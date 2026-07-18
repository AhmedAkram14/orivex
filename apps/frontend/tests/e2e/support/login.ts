import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Matches src/mocks/auth-store.ts's MOCK_ACCOUNTS exactly -- these are the
// only credentials the MSW-backed /auth/login handler ever accepts.
export const MOCK_CREDENTIALS = {
  patient: { email: 'patient@orivex.dev', password: 'Password123!', fullName: 'Amina Youssef' },
  doctor: { email: 'doctor@orivex.dev', password: 'Password123!', fullName: 'Dr. Sarah Ahmed' },
} as const;

export async function loginAs(page: Page, role: keyof typeof MOCK_CREDENTIALS): Promise<void> {
  const { email, password } = MOCK_CREDENTIALS[role];

  await page.goto('/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/en\/dashboard$/);
}
