import { expect, test } from '@playwright/test';

import { MOCK_CREDENTIALS, loginAs } from './support/login.js';

test.describe('Authentication', () => {
  test('shows a validation message instead of submitting when required fields are empty', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Email is required.')).toBeVisible();
  });

  test('surfaces an inline error for invalid credentials without navigating away', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel('Email').fill(MOCK_CREDENTIALS.patient.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The App Router's route announcer (#__next-route-announcer__) also
    // carries role="alert", so scope to the one actually containing our text.
    await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password.' })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test('logs in as a patient and lands on the authenticated dashboard', async ({ page }) => {
    await loginAs(page, 'patient');

    // loginAs already asserts the /en/patient redirect -- the shared
    // /en/dashboard route is a transient hop only (see login.ts's own
    // comment): DashboardPage immediately redirects every role onward to
    // its real workspace home, so a patient session never actually stays
    // on a page titled "Dashboard". "My Health" is /en/patient's own real
    // heading (messages/en.json's patient.dashboard.title).
    await expect(page.getByRole('heading', { name: 'My Health' })).toBeVisible();
  });

  test('logs out and returns to an unauthenticated state', async ({ page }) => {
    await loginAs(page, 'doctor');

    // The account-menu trigger is an Avatar showing initials ("Dr. Sarah
    // Ahmed" -> "DA", see UserMenu's initialsFor()) -- no separate
    // accessible name is set on the trigger itself.
    await page.getByRole('button', { name: 'DA' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    // The protected-route guard redirects a signed-out visitor to
    // /unauthorized (with its own "Sign in" link) rather than straight to
    // /login -- following that link completes the "back to unauthenticated"
    // journey. It now carries a real ?returnTo= so signing back in can
    // resume where the guard caught them, so match the path only.
    await expect(page).toHaveURL(/\/en\/unauthorized(\?|$)/);
    await page.getByRole('link', { name: 'Sign in' }).click();
    // Also now carries the same real ?returnTo= as /unauthorized above.
    await expect(page).toHaveURL(/\/en\/login(\?|$)/);
  });
});
