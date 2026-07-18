import { expect, test } from '@playwright/test';

import { loginAs } from './support/login.js';

test.describe('Patient Dashboard', () => {
  test('renders the welcome message and an honest zero-state summary', async ({ page }) => {
    await loginAs(page, 'patient');

    await page.goto('/en/patient');

    await expect(page.getByText('Welcome back, Amina Youssef.')).toBeVisible();
    await expect(page.getByText('No appointments scheduled yet')).toBeVisible();
    await expect(page.getByText('No active prescriptions')).toBeVisible();
  });
});
