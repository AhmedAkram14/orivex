import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Doctor Dashboard', () => {
  test('renders the welcome message and the real busy-practice schedule', async ({ page }) => {
    await loginAs(page, 'doctor');

    await page.goto('/en/doctor');

    await expect(page.getByText('Welcome back, Dr. Sarah Ahmed.')).toBeVisible();
    // doctor-store.ts's mock is a deliberate "busy practice" seed (real
    // scheduled-today work), not an empty state -- assert the widget that
    // renders it, not stale zero-state copy that no longer applies here.
    await expect(page.getByRole('heading', { name: 'Upcoming work' })).toBeVisible();
  });
});
